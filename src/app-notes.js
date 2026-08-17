/**
 * Notater. Three notes in a sidebar; the first one is the point of the whole
 * thing, the other two are there so it reads like someone's actual app and not
 * a single greeting card in disguise.
 *
 * Same voice as the board: written by whoever stayed home and looked through
 * the photos afterwards. No names, no dates, "dere" — never "vi".
 */

const NOTES = [
  {
    id: 'du-er',
    title: 'DU ER',
    meta: 'i dag · redigert nå nettopp',
    kind: 'list',
    // The last one is deliberately unticked. It is the only item on the list
    // that is not already true.
    items: [
      { text: 'flinkere enn du gir deg selv kred for', done: true },
      { text: 'grunnen til at jeg gidder mandager', done: true },
      { text: 'den som ler høyest på omtrent hvert fjerde bilde', done: true },
      { text: 'god å ha rundt seg, også på de kjipe dagene', done: true },
      { text: 'bedre enn du tror, særlig når du tviler', done: true },
      { text: 'lettere å savne enn noen burde ha lov til', done: true },
      { text: 'peneste i verden, og litt for stolt av den nye maskinen din', done: true },
      { text: 'med på neste tur — den fikser vi', done: false },
    ],
  },
  {
    id: 'turen',
    title: 'Turen',
    meta: 'sett gjennom for mange ganger',
    kind: 'text',
    body: [
      'Jeg har sett gjennom hvert eneste bilde. Flere ganger enn jeg vil innrømme her.',
      'Sola står lavt på halvparten av dem. Dere ser ut som dere holdt på å le av noe rett før.',
      'Jeg har lagret alle sammen. Selv de uskarpe.',
      'Neste gang står jeg i bakgrunnen på minst ett av dem.',
    ],
  },
  {
    id: 'ikke-send',
    title: 'Ikke send',
    meta: 'skrevet altfor sent',
    kind: 'text',
    body: [
      'Jeg er ikke så flink til å si sånt høyt, så det får stå her i stedet.',
      'Du er det beste jeg vet om.',
      'Gratulerer med den nye. Bruk den til noe fint — begynn med dette.',
    ],
  },
];

export function createNotesApp() {
  const el = document.createElement('div');
  el.className = 'notes-app';
  el.innerHTML = `
    <aside class="notes-sidebar">
      <p class="notes-sidebar-head">Mapper</p>
      <ul class="notes-folders"></ul>
    </aside>
    <section class="notes-main"></section>
  `;

  const folders = el.querySelector('.notes-folders');
  const main = el.querySelector('.notes-main');

  NOTES.forEach((note, i) => {
    const li = document.createElement('li');
    li.className = `notes-folder${i === 0 ? ' is-active' : ''}`;
    li.textContent = note.title;
    li.addEventListener('click', () => {
      folders.querySelectorAll('.notes-folder').forEach((f) => f.classList.remove('is-active'));
      li.classList.add('is-active');
      render(main, note);
    });
    folders.appendChild(li);
  });

  render(main, NOTES[0]);
  return el;
}

function render(main, note) {
  main.replaceChildren();

  const meta = document.createElement('p');
  meta.className = 'notes-meta';
  meta.textContent = note.meta;

  const h = document.createElement('h2');
  h.className = 'notes-title';
  h.textContent = note.title;

  main.append(meta, h);

  if (note.kind === 'list') {
    const ul = document.createElement('ul');
    ul.className = 'notes-list';

    note.items.forEach((item) => {
      const li = document.createElement('li');
      li.className = `notes-item${item.done ? ' is-done' : ''}`;
      li.innerHTML = `<span class="notes-check" aria-hidden="true"></span><span class="notes-text"></span>`;
      li.querySelector('.notes-text').textContent = item.text;
      // Ticking things off is half the pleasure of a list.
      li.addEventListener('click', () => li.classList.toggle('is-done'));
      ul.appendChild(li);
    });

    const foot = document.createElement('p');
    foot.className = 'notes-foot';
    foot.textContent = 'punktene over er ikke til diskusjon';
    main.append(ul, foot);
    return;
  }

  note.body.forEach((line) => {
    const p = document.createElement('p');
    p.className = 'notes-para';
    p.textContent = line;
    main.appendChild(p);
  });
}
