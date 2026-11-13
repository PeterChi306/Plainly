export const THEME_KEY = "plainly-theme";

/** Runs in <head> before paint so a chosen theme never flashes the other one. */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
