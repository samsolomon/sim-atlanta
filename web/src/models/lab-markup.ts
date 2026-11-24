/**
 * The Model lab's markup, in one place for both hosts: /models.html, and the Models view inside
 * the app (A2c). models/main.ts mounts it before it looks anything up, and a contract test checks
 * that every id it reads is here. Add new lab controls (fieldsets, groups) to this string, not to
 * models.html.
 */
export const LAB_HTML = `

    <aside class="sidebar" aria-label="Model library and controls">
      <header class="lab-header">
        <nav aria-label="Site"><a href="/">← Sim Atlanta</a><a href="/about">About</a></nav>
        <h1>Model Lab</h1>
      </header>
      <div class="inspector">
        <section class="library" aria-label="Model library">
          <div class="model-group" role="group" aria-labelledby="vehicles-label" id="vehicles"><h2 id="vehicles-label">Vehicles</h2></div>
          <div class="model-group" role="group" aria-labelledby="people-label" id="people"><h2 id="people-label">People</h2></div>
          <div class="model-group" role="group" aria-labelledby="trees-label" id="trees"><h2 id="trees-label">Trees</h2></div>
          <div class="model-group" role="group" aria-labelledby="landscape-label" id="landscape"><h2 id="landscape-label">Landscape</h2></div>
          <div class="model-group" role="group" aria-labelledby="houses-label" id="houses"><h2 id="houses-label">Houses</h2></div>
          <div class="model-group" role="group" aria-labelledby="materials-label" id="materials"><h2 id="materials-label">Materials</h2></div>
          <label class="mobile-model">Model <select id="model-select"></select></label>
        </section>
        <section class="settings" aria-label="Model controls">
          <fieldset id="motion" hidden><legend>Motion</legend>
            <div class="playback"><button id="play" type="button">Pause</button><input id="phase" type="range" min="0" max="100" step="1" value="0" aria-label="Pose in animation cycle" /></div>
          </fieldset>
          <fieldset id="lines"><legend>Line colour</legend></fieldset>
          <fieldset id="roles"><legend>Cab end</legend></fieldset>
          <fieldset id="platforms"><legend>Platform</legend><p id="platform-report" class="platform-report" hidden></p></fieldset>
          <fieldset id="tree-size" hidden><legend>Size class</legend><p id="tree-report" class="platform-report"></p></fieldset>
          <fieldset id="season" hidden><legend>Season</legend><p id="season-report" class="platform-report"></p></fieldset>
          <fieldset id="articulation" hidden><legend>Articulation</legend><label>Joint angle <input id="joint-angle" type="range" min="-35" max="35" value="0"></label><output id="joint-value" for="joint-angle">0°</output><button type="button" id="joint-reset">Straight</button></fieldset>
          <fieldset id="tier" hidden><legend>Detail</legend></fieldset>
          <fieldset id="rendering" hidden><legend>Ginkgo rendering</legend><p id="variant-report" class="platform-report"></p></fieldset>
          <fieldset id="count" hidden><legend>Trees (cost test)</legend><p id="perf-report" class="platform-report"></p></fieldset>
          <fieldset id="views"><legend>View</legend></fieldset>
          <fieldset><legend>Display</legend><button id="next-look" type="button" hidden>Next look</button><button id="night" type="button" aria-pressed="false">Night</button><button id="ink" type="button" aria-pressed="true">Ink outlines</button></fieldset>
          <fieldset><legend>Reference photo</legend>
            <div class="reference-controls"><label class="file-button">Load photo…<input id="file" type="file" accept="image/*" /></label><input id="opacity" type="range" min="0" max="1" step="0.05" value="0.45" aria-label="Photo opacity" disabled /><button id="clear-photo" type="button" hidden>Remove</button></div>
          </fieldset>
        </section>
      </div>
    </aside>
    <main class="preview" aria-labelledby="title">
      <header class="model-heading"><h2 id="title">Stadler CQ400</h2><p id="blurb"></p></header>
      <div id="stage"><img id="ref" alt="Reference photo overlay" hidden /></div>
    </main>
`;

/** Insert the lab into `root` (default: the page body) once, and mark it for lab.css's scope. */
export function mountLab(root: HTMLElement = document.getElementById('lab-root') ?? document.body) {
  root.classList.add('lab');
  if (!document.getElementById('stage')) root.insertAdjacentHTML('afterbegin', LAB_HTML);
}
