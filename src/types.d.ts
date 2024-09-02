/**
 * Honkit plugin resource object
 */
export type PluginResource = {
  assets: string;
  js?: string[];
  css?: string[];
};

/**
 * Honkit page object
 * @see {@link https://honkit.netlify.app/plugins/hooks}
 */
export type Page = {
  // Parser named
  type: "markdown" | "asciidoc";

  // File Path relative to book root
  path: string; // e.g. "page.md"

  // Absolute file path
  rawpath: string; // e.g. "/usr/..."

  // Title of the page in the SUMMARY
  title: string;

  // Content of the page
  // Markdown/Asciidoc in "page:before"
  // HTML in "page"
  content: string; // e.g. "<h1>Hello</h1>"

  // Level of the page
  level: string; // e.g. "1.5.3.1"

  // Depth of the page
  depth: number; // e.g. 3

  // Other attributes appear in the .md between two '---' at the beginning of the content
  // For example in the front of the markdown:
  // ---
  // description: This is a description
  // ---
  description: string; // e.g. "This is a description"

  // previous;
  // next;
  // dir
  // progress
  // sections
};
