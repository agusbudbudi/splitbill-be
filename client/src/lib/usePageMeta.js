import { useEffect } from "react";

const APP_NAME = "Split Bill Admin";

/**
 * Sets the document title and meta description for the current page.
 * @param {string} title - Page title (without app name suffix)
 * @param {string} [description] - Meta description for the page
 */
export function usePageMeta(title, description) {
  useEffect(() => {
    // Set document title
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;

    // Set or create meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      "content",
      description || "Dashboard admin untuk mengelola platform Split Bill.",
    );

    // Cleanup: restore defaults on unmount
    return () => {
      document.title = APP_NAME;
    };
  }, [title, description]);
}
