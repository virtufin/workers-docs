// Click-to-zoom for Mermaid diagrams, via a dedicated button -- not a
// click anywhere on the diagram.
//
// Material's own Mermaid renderer (bundle.min.js's Zn()) puts each
// diagram's <svg> inside a *closed* shadow root on a `div.mermaid` host
// (attachShadow({mode: "closed"})), rendered asynchronously once
// mermaid.js loads. "closed" mode blocks all external access to that
// content (composedPath() included -- that only leaks for
// mode: "open"), so there is no way to read or clone the <svg> markup;
// zooming instead fixed-positions and transform: scale()s the host div
// itself in place, which works regardless of shadow-DOM access since
// transform is a paint-level operation.
//
// A whole-diagram click handler doesn't work here: every node in these
// diagrams carries a Mermaid `click nodeName "url" ... _blank`
// navigation directive, so a click anywhere on a node already means
// "open that repo's docs" -- a background click-to-zoom handler and
// per-node navigation links were fighting over the same click on
// nearly the whole diagram surface. A small always-present zoom button
// (added next to each diagram, not part of it) removes the ambiguity:
// clicking the diagram always navigates (unchanged Mermaid behavior),
// clicking the button always zooms.
//
// Single source of truth: fetched into every repo's docs build by
// virtufin-common/.github/workflows/docs-common.yaml's "Fetch shared
// docs templates" step, not committed per-repo. Fix it here once.

function zoomDiagram(host) {
  var rect = host.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  var scale = Math.min(
    (window.innerWidth * 0.9) / rect.width,
    (window.innerHeight * 0.9) / rect.height,
    3
  );
  if (scale <= 1.05) return; // already fills most of the viewport -- not worth it

  var backdrop = document.createElement('div');
  backdrop.className = 'mermaid-zoom-backdrop';
  backdrop.addEventListener('click', closeMermaidZoom);
  document.body.appendChild(backdrop);

  // Freeze the box at its current in-flow size before taking it out of
  // flow (position: fixed) -- otherwise it could reflow against the
  // (mostly unconstrained) fixed-position containing block first.
  host.style.width = rect.width + 'px';
  host.style.height = rect.height + 'px';
  host.style.setProperty('--mermaid-zoom-scale', String(scale));
  host.classList.add('mermaid-zoomed');
  document.body.classList.add('mermaid-zoom-active');
}

function closeMermaidZoom() {
  var zoomed = document.querySelector('.mermaid.mermaid-zoomed');
  if (!zoomed) return false;
  zoomed.classList.remove('mermaid-zoomed');
  zoomed.style.removeProperty('--mermaid-zoom-scale');
  zoomed.style.removeProperty('width');
  zoomed.style.removeProperty('height');
  var backdrop = document.querySelector('.mermaid-zoom-backdrop');
  if (backdrop) backdrop.remove();
  document.body.classList.remove('mermaid-zoom-active');
  return true;
}

// `magnify-plus-outline`, a standard zoom-in glyph (same inline-SVG-icon
// convention Material itself uses for the header's menu/search icons).
var ZOOM_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">' +
  '<path d="M12,10H10V12H9V10H7V9H9V7H10V9H12V10M15.5,14H14.71L14.43,13.73C15.41,12.59 16,11.11 16,9.5A6.5,6.5 0 0,0 9.5,3A6.5,6.5 0 0,0 3,9.5A6.5,6.5 0 0,0 9.5,16C11.11,16 12.59,15.41 13.73,14.43L14,14.71V15.5L19,20.49L20.49,19L15.5,14M9.5,14C7,14 5,12 5,9.5C5,7 7,5 9.5,5C12,5 14,7 14,9.5C14,12 12,14 9.5,14Z"/>' +
  '</svg>';

function addZoomButton(host) {
  if (host.dataset.mermaidZoomReady) return;
  host.dataset.mermaidZoomReady = 'true';

  var wrapper = document.createElement('div');
  wrapper.className = 'mermaid-zoom-wrapper';
  host.parentNode.insertBefore(wrapper, host);
  wrapper.appendChild(host);

  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'mermaid-zoom-button';
  button.setAttribute('aria-label', 'Zoom diagram');
  button.title = 'Zoom diagram';
  button.innerHTML = ZOOM_ICON_SVG;
  button.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    zoomDiagram(host);
  });
  wrapper.appendChild(button);
}

// Mermaid rendering is async (mermaid.js loads, then Material replaces
// each `pre.mermaid` with a shadow-hosting `div.mermaid`), so diagrams
// may not exist yet when this script runs -- catch both cases.
document.querySelectorAll('div.mermaid').forEach(addZoomButton);
new MutationObserver(function (mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var added = mutations[i].addedNodes;
    for (var j = 0; j < added.length; j++) {
      var node = added[j];
      if (node.nodeType !== 1) continue;
      if (node.matches && node.matches('div.mermaid')) addZoomButton(node);
      if (node.querySelectorAll) {
        node.querySelectorAll('div.mermaid').forEach(addZoomButton);
      }
    }
  }
}).observe(document.body, { childList: true, subtree: true });

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') closeMermaidZoom();
});
