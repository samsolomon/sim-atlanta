import { ICON } from './icons';

/** The legend dialog: colour means the kind of service; truth tiers. */
export function createKeyDialog(): HTMLDialogElement {
  const key = document.createElement('dialog');
  key.className = 'key glass';
  key.setAttribute('aria-label', 'Key');
  key.innerHTML = `
    <form method="dialog"><button class="key-close icon-btn" aria-label="Close"><span class="ic">${ICON.x}</span></button></form>
    <h2>Key</h2>
    <p class="key-lede">Colour shows the kind of service, not the operator.</p>
    <ul class="legend">
      <li><span class="sw sw-city"></span><b>City rail</b> subway, light rail, streetcar</li>
      <li><span class="sw-bus"></span><b>Bus</b> live position</li>
      <li><span class="sw sw-inter"></span><b>Intercity</b> Amtrak</li>
      <li><span class="sw sw-rep"></span><b>Freight</b> thicker = more trains a day (reported)</li>
      <li><span class="sw sw-inf"></span><b>Inferred</b> traffic from nearby track</li>
      <li><span class="tr tr-live"></span><b>Live</b> train <span class="tr tr-sched"></span><b>Scheduled</b> (timetable)</li>
    </ul>
    <p class="key-foot">Live means MARTA reported it in the last few minutes. Scheduled is where the timetable says a train should be. Freight movements are illustrative.</p>`;
  key.addEventListener('click', (e) => e.target === key && key.close());
  return key;
}
