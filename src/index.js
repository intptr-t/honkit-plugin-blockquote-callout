// @ts-check
/**
 * @typedef {import("./types").Page} Page
 * @typedef {import("./types").PluginResource} PluginResource
 * @typedef {import("./index").CallOutRegexPattern} CallOutRegexPattern
 * @typedef {import("./index").CallOutType} CallOutType
 * @typedef {import("./index").CallOutSettings} CallOutSettings
 */
const fs = require("node:fs");
const path = require("node:path");

/**
 * Honkit plugin resource
 * @type {PluginResource}
 */
const pluginResource = {
  assets: "./assets",
  css: ["style.css"],
};

/** @type {ReadonlyArray<CallOutRegexPattern>} */
const patterns = [
  // case1
  // ```
  // <blockquote>
  // <p>[!Warning]</p>
  // <p>Contents text</p>
  // <p>...</p>
  // </blockquote>
  // ```
  // group[1](type): Warning
  // group[2](contents): <p>Contents text</p><p>...</p>
  //
  // => We can use the extracted content as is.
  {
    pattern: /<blockquote>\s+<p>\[!(?<type>[\s\S]+)\]<\/p>\n(?<contents>[\s\S]*?)<\/blockquote>/g,
    fix: (str) => {
      return str;
    },
  },
  // case2
  // ```
  // <blockquote>
  // <p>[!NOTE]
  // Contents text</p>
  // <p>...</p>
  // </blockquote>
  // ```
  // group[1](type): NOTE
  // group[2](contents): Contents text</p><p>...
  //
  // => We do not use extracted content as is. The content needs to be modified.
  {
    pattern: /<blockquote>\s+<p>\[!(?<type>[\s\S]+)\]\n(?<contents>[\s\S]*?)<\/p>\s*<\/blockquote>/g,
    fix: (str) => {
      return `<p>${str}</p>`;
    },
  },
];

/** @satisfies {Record<CallOutType, ReturnType<loadDefaultRawSvg>>}*/
const icons = /** @type {const} */ ({
  note: loadDefaultRawSvg("info-16.svg"),
  tip: loadDefaultRawSvg("light-bulb-16.svg"),
  important: loadDefaultRawSvg("report-16.svg"),
  warning: loadDefaultRawSvg("alert-16.svg"),
  caution: loadDefaultRawSvg("stop-16.svg"),
});

/**
 * Load icon as raw data
 * @param {string} name file name
 */
function loadDefaultRawSvg(name) {
  const assetIconPath = path.resolve(__dirname, "../icons/octicons");
  const assetIconFilePath = path.resolve(assetIconPath, name);
  const icon = fs.readFileSync(assetIconFilePath, "binary");
  return icon;
}

/**
 * Convert callout-like string to CallOutType if it is included in convert-able icons
 * @param {string} calloutLike
 */
function typeToCallOutType(calloutLike) {
  const type = calloutLike.toLowerCase();
  if (icons[type]) {
    return /** @type {CallOutType} */ (type);
  }
  return null;
}

/**
 * Capitalize the first letter of the string
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Sanitize string
 * @param {string} str
 * @returns {string}
 */
function lazySanitize(str) {
  const result = str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;'")
    .replace(/`/g, "&#x60;'");
  return result;
}

/**
 * Generate call-out content
 * @param {object} args
 * @param {string} args.contents
 * @param {CallOutRegexPattern} args.pattern
 * @param {string} args.icon
 * @param {string} args.title
 * @param {string} args.className
 * @param {string} args.titleClassName
 */
function generateCallOutContent({ contents, pattern, icon, title, className, titleClassName }) {
  // biome-ignore format: To align tag indent.
  return (
    `<div class="${className}">
      <p class="${titleClassName}">
        ${icon}
        <span>${lazySanitize(title)}</span>
      </p>
      ${pattern.fix(contents)}
    </div>`
  );
}

/**
 * Parse the type and settings from the string
 * @param {string} typeWithSettings
 * @example
 *
 * ```javascript
 * parseArguments(`NOTE`); // { type: 'NOTE', settings: {} }
 *
 * parseArguments(`NOTE|aa:bb|cc:" d|d "|ee: 'f|f'`); // { type: 'NOTE', settings: { aa: 'bb', cc: ' d|d ', ee: 'f|f' } }
 *
 * parseArguments(`NOTE | aa:bb | cc: "d|\"d\""`); // { type: 'NOTE', settings: { aa: 'bb', cc: 'd|"d"' } }
 * ```
 * @returns {{type: string, settings: CallOutSettings}}
 */
function parseArguments(typeWithSettings) {
  // Use a regular expression to break up the portion delimited by "|" into arrays.
  // However, if "|" is enclosed in double or single quotes, it is ignored.
  // example: `NOTE|aa:bb|cc:" d|d "|ee: 'f|f'`` => ["NOTE", "aa:bb", "cc:\" d|d \"", "ee: 'f|f'"]
  const splitRegex = /(?:[^|"'\\]+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+/g;
  const match = typeWithSettings.match(splitRegex);
  if (!match) {
    return { type: typeWithSettings, settings: {} };
  }

  const type = match[0].trim();

  // Split into key-values while deleting preceding and following whitespace
  const settings = match.slice(1).reduce((acc, s) => {
    const [key, value] = s.split(":");
    const quoteRemovedText = value.trim().replace(/^['"]|['"]$/g, "");
    acc[key.trim()] = quoteRemovedText;
    return acc;
  }, {});

  return { type, settings };
}

/**
 * Replace <blockquote> to call-out element's text
 * @param {Page} page
 * @returns {Page}
 */
function replaceBlockQuoteToCallOut(page) {
  // console.debug(`[honkit-plugin-note-callout] ${JSON.stringify(page)}`);

  // split `<blockquote>〜</blockquote>`
  const matches = [...page.content.matchAll(/<blockquote>([\s\S]*?)<\/blockquote>/g)];
  if (!matches || matches.length <= 0) {
    return page;
  }

  for (const match of matches) {
    const group = match[0]; // [0] is the original string that matched and always exists
    for (const pattern of patterns) {
      // Since it is divided by <blockquote>, only one matches, so extract it with [0]
      const blockQuoteMatch = [...group.matchAll(pattern.pattern)][0];

      if (!blockQuoteMatch || blockQuoteMatch.length <= 0) {
        continue;
      }

      const original = blockQuoteMatch[0];
      const type = blockQuoteMatch.groups?.type ?? blockQuoteMatch[1] ?? null;
      const contents = blockQuoteMatch.groups?.contents ?? blockQuoteMatch[2] ?? null;
      if (!type || !contents) {
        continue;
      }
      const args = parseArguments(type);

      const callOutType = typeToCallOutType(args.type);
      if (!callOutType) {
        continue;
      }
      const title = args.settings.title ?? capitalize(type);
      const icon = icons[callOutType];
      const className = args.settings.className ?? `markdown-alert markdown-alert-${callOutType.toLowerCase()}`;
      const titleClassName = args.settings.titleClassName ?? "markdown-alert-title";

      // Replace the original blockquote with a div element with a class that matches the type.
      const replacedContent = generateCallOutContent({
        contents,
        pattern,
        title,
        icon,
        className,
        titleClassName,
      });

      page.content = page.content.replace(original, replacedContent);
    }
  }

  return page;
}

module.exports = {
  ebook: pluginResource,
  website: pluginResource,
  hooks: {
    page: replaceBlockQuoteToCallOut,
  },
};
