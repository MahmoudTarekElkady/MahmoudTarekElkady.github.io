/* A small, local-only exploration game for the portfolio. */
(() => {
    'use strict';

    const storageKey = 'elkady-project-world-v1';
    const regions = [
        { id: 'xr', name: 'XR Outpost', badge: 'XR Ranger', color: '#61e4b0', description: 'Step into immersive training worlds.' },
        { id: 'unity', name: 'Unity Grove', badge: 'Unity Crafter', color: '#79c9ff', description: 'Discover puzzles, multiplayer, and defense systems.' },
        { id: 'unreal', name: 'Unreal Arena', badge: 'Unreal Vanguard', color: '#d5b1ff', description: 'Explore combat, AI, and puzzle adventures.' }
    ];
    const levels = [
        { file: 'tvtc_electricity.html', region: 'xr', name: 'TVTC Electrical Safety', short: 'Power Station', x: 18, y: 67, summary: 'Inspect a bilingual VR simulator for electrical safety, panel wiring, and guided training.' },
        { file: 'cst_walkthrough.html', region: 'xr', name: 'Clinical Simulator Training', short: 'Medical Bay', x: 50, y: 80, summary: 'Explore clinical training with simulated operations and hand-tracking interactions.' },
        { file: 'asthma_first_aid.html', region: 'xr', name: 'Asthma First Aid VR', short: 'First Aid', x: 82, y: 67, summary: 'Discover an interactive emergency scenario for practicing asthma first aid.' },
        { file: 'altitude_sickness.html', region: 'xr', name: 'Altitude Sickness VR', short: 'High Summit', x: 82, y: 26, summary: 'Climb into a symptom simulation with medical-response training.' },
        { file: 'hyperloop.html', region: 'xr', name: 'HyperLoop VR', short: 'Transit Gate', x: 50, y: 22, summary: 'Visit a futuristic transit environment with immersive XR interactions.' },
        { file: 'xr_stf.html', region: 'xr', name: 'Slips, Trips & Falls XR', short: 'Safety Lab', x: 18, y: 26, summary: 'Investigate an XR experience built to raise awareness of slips, trips, and falls.' },
        { file: 'mmorpg.html', region: 'unity', name: 'AR MMORPG', short: 'Open World', x: 20, y: 65, summary: 'Explore an augmented-reality MMORPG with multiplayer systems and AI-driven NPC behavior.' },
        { file: 'color_swap.html', region: 'unity', name: 'Color Swap', short: 'Puzzle Garden', x: 50, y: 27, summary: 'Solve the design behind a mobile puzzle game built around color swaps and graph constraints.' },
        { file: 'farm_invaders.html', region: 'unity', name: 'Farm Invaders', short: 'Alien Farm', x: 80, y: 65, summary: 'Discover a Unity tower-defense game where players protect their farm from alien invaders.' },
        { file: 'toon_tanks.html', region: 'unreal', name: 'Toon Tanks', short: 'Tank Yard', x: 18, y: 70, summary: 'Explore a tank-combat game with enemy towers, incoming attacks, and combat systems.' },
        { file: 'shooter_demo.html', region: 'unreal', name: 'Shooter Demo', short: 'Combat Zone', x: 18, y: 28, summary: 'Inspect an Unreal shooter demo featuring AI mechanics and immersive environments.' },
        { file: 'obstacle_assault.html', region: 'unreal', name: 'Obstacle Assault', short: 'Obstacle Run', x: 50, y: 22, summary: 'Explore platform challenges, moving obstacles, and engaging level mechanics.' },
        { file: 'crypt_raider.html', region: 'unreal', name: 'Crypt Raider', short: 'Ancient Crypt', x: 82, y: 28, summary: 'Uncover an Unreal puzzle adventure about finding treasure and escaping a crypt.' },
        { file: 'undead_hell.html', region: 'unreal', name: 'Undead Hell', short: 'Survival Camp', x: 82, y: 70, summary: 'Discover a survival game with waves of undead enemies and challenging combat.' }
    ];
    const ranks = [
        { xp: 0, name: 'New Adventurer' }, { xp: 25, name: 'Scout' },
        { xp: 100, name: 'Pathfinder' }, { xp: 200, name: 'Systems Adventurer' },
        { xp: 350, name: 'World Explorer' }
    ];
    let persistent = true;
    const emptyState = () => ({ active: false, visited: [], region: 'xr', selected: levels[0].file });
    function readState() {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey));
            if (!saved || typeof saved !== 'object') return emptyState();
            const visited = Array.isArray(saved.visited) ? [...new Set(saved.visited.filter(file => levels.some(level => level.file === file)))] : [];
            const region = regions.some(item => item.id === saved.region) ? saved.region : 'xr';
            const selected = levels.find(level => level.file === saved.selected && level.region === region)?.file || levels.find(level => level.region === region).file;
            return { active: saved.active === true, visited, region, selected };
        } catch (_) {
            persistent = false;
            return emptyState();
        }
    }
    let state = readState();
    const page = location.pathname.split('/').pop();
    const currentLevel = levels.find(level => level.file === page);
    let world;
    let liveStatus;
    let shortcut;
    let worldVisible = false;
    let pendingMessage = '';
    const currentRegion = () => regions.find(region => region.id === state.region);
    const regionLevels = () => levels.filter(level => level.region === state.region);
    const selectedLevel = () => levels.find(level => level.file === state.selected);
    const xp = () => state.visited.length * 25;
    const rank = () => [...ranks].reverse().find(item => xp() >= item.xp);
    function save() {
        try {
            localStorage.setItem(storageKey, JSON.stringify(state));
            persistent = true;
        }
        catch (_) { persistent = false; }
    }
    function announce(message) {
        if (liveStatus) liveStatus.textContent = message;
    }
    function enterLevel() {
        state.active = true;
        save();
        location.href = selectedLevel().file;
    }
    function select(file, speak = true) {
        state.selected = file;
        save();
        update();
        if (speak) announce('Selected ' + selectedLevel().name + '. Enter this level to explore the project.');
    }
    function travel(regionId, focusMap = false) {
        state.region = regionId;
        state.selected = levels.find(level => level.region === regionId && !state.visited.includes(level.file))?.file || levels.find(level => level.region === regionId).file;
        save();
        drawMap();
        update();
        announce('Travelled to ' + currentRegion().name + '. ' + selectedLevel().name + ' selected.');
        if (focusMap) world.querySelector('.world-stage').focus();
    }
    function drawMap() {
        const mapLevels = regionLevels();
        world.style.setProperty('--world-accent', currentRegion().color);
        world.dataset.region = state.region;
        const points = mapLevels.map(level => level.x + ',' + level.y).join(' ');
        world.querySelector('.world-route').setAttribute('points', points);
        const pins = world.querySelector('.world-pins');
        pins.replaceChildren();
        mapLevels.forEach(level => {
            const pin = document.createElement('button');
            pin.type = 'button';
            pin.className = 'world-pin';
            pin.dataset.level = level.file;
            pin.style.left = level.x + '%';
            pin.style.top = level.y + '%';
            const icon = document.createElement('span');
            icon.className = 'world-pin-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = String(levels.indexOf(level) + 1).padStart(2, '0');
            const label = document.createElement('span');
            label.className = 'world-pin-label';
            label.textContent = level.short;
            pin.append(icon, label);
            pin.addEventListener('click', () => select(level.file));
            pins.append(pin);
        });
    }
    function update() {
        if (shortcut) shortcut.textContent = 'World map · ' + xp() + ' XP';
        if (!world) return;
        const selected = selectedLevel();
        world.querySelector('.world-rank').textContent = rank().name;
        world.querySelector('.world-xp').textContent = xp() + ' / 350 XP';
        world.querySelector('progress').value = state.visited.length;
        world.querySelector('.world-progress-label').textContent = state.visited.length + ' of 14 levels explored';
        world.querySelector('.world-region-description').textContent = currentRegion().description;
        world.querySelector('.world-level-number').textContent = 'LEVEL ' + String(levels.indexOf(selected) + 1).padStart(2, '0') + ' · ' + (state.region === 'unreal' ? 'UNREAL ENGINE' : 'UNITY ENGINE');
        world.querySelector('.world-level-title').textContent = selected.name;
        world.querySelector('.world-level-summary').textContent = selected.summary;
        world.querySelector('.world-level-status').textContent = state.visited.includes(selected.file) ? 'Explored · 25 XP earned' : 'Explore this project · +25 XP';
        world.querySelector('.world-enter').textContent = state.visited.includes(selected.file) ? 'Revisit level →' : 'Enter level →';
        world.querySelector('.world-start').hidden = state.active;
        world.querySelector('.world-save-note').textContent = persistent ? 'Progress is saved in this browser. No sign-in needed.' : 'Browser storage is unavailable. Progress lasts for this page visit.';
        world.querySelectorAll('[data-region]').forEach(button => {
            if (button === world) return;
            const region = regions.find(item => item.id === button.dataset.region);
            const count = state.visited.filter(file => levels.some(level => level.file === file && level.region === region.id)).length;
            button.setAttribute('aria-pressed', String(region.id === state.region));
            button.querySelector('small').textContent = count + '/' + levels.filter(level => level.region === region.id).length;
        });
        world.querySelectorAll('.world-pin').forEach(pin => {
            const level = levels.find(item => item.file === pin.dataset.level);
            const explored = state.visited.includes(level.file);
            pin.classList.toggle('is-selected', level.file === selected.file);
            pin.classList.toggle('is-explored', explored);
            pin.setAttribute('aria-pressed', String(level.file === selected.file));
            pin.setAttribute('aria-label', 'Level ' + (levels.indexOf(level) + 1) + ': ' + level.name + (explored ? ', explored' : ', unexplored'));
        });
        const player = world.querySelector('.world-player');
        player.style.left = selected.x + '%';
        player.style.top = selected.y + '%';
        const achievements = [{ name: 'First Steps', unlocked: state.visited.length > 0 }, ...regions.map(region => ({ name: region.badge, unlocked: levels.filter(level => level.region === region.id).every(level => state.visited.includes(level.file)) })), { name: 'World Explorer', unlocked: state.visited.length === levels.length }];
        world.querySelectorAll('.world-badge').forEach((badge, index) => {
            const achievement = achievements[index];
            badge.classList.toggle('is-unlocked', achievement.unlocked);
            badge.textContent = (achievement.unlocked ? '◆ ' : '◇ ') + achievement.name;
            badge.setAttribute('aria-label', achievement.name + (achievement.unlocked ? ', unlocked' : ', not earned yet'));
        });
        document.querySelectorAll('.project-card').forEach(card => {
            const file = card.querySelector('h2 a')?.getAttribute('href');
            let badge = card.querySelector('.world-card-badge');
            if (state.active && state.visited.includes(file) && !badge) {
                badge = document.createElement('span');
                badge.className = 'world-card-badge';
                badge.textContent = '✓ Level explored';
                card.querySelector('header').append(badge);
            } else if (!state.active && badge) badge.remove();
        });
    }
    function makeWorld() {
        world = document.createElement('section');
        world.id = 'world';
        world.className = 'project-world';
        world.setAttribute('aria-labelledby', 'world-title');
        world.innerHTML = `
            <div class="world-heading"><div><span class="world-eyebrow">THE PLAYABLE PORTFOLIO</span><h2 id="world-title">Every project is a new world.</h2><p>Pick a region. Move your explorer. Enter a level to discover the systems behind it.</p></div><button type="button" class="world-start">Start adventure</button></div>
            <div class="world-stats"><span class="world-rank"></span><span class="world-xp"></span><progress max="14" value="0" aria-label="Project exploration progress"></progress><span class="world-progress-label"></span></div>
            <div class="world-regions" role="group" aria-label="Travel to a region">${regions.map(region => `<button type="button" data-region="${region.id}"><span>${region.name}</span><small></small></button>`).join('')}</div>
            <div class="world-layout"><div class="world-map-panel"><p class="world-region-description"></p>
                <div class="world-stage" tabindex="0" role="group" aria-label="Playable project map. Left and right or A and D move between levels. Up and down or W and S change regions. Enter opens the selected project.">
                    <div class="world-terrain" aria-hidden="true"></div><svg class="world-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline class="world-route" fill="none" vector-effect="non-scaling-stroke" /></svg>
                    <span class="world-map-compass" aria-hidden="true">N ↑</span><div class="world-pins"></div><span class="world-player" aria-hidden="true"><span>YOU</span>◆</span>
                </div>
                <div class="world-controls"><button type="button" class="world-prev" aria-label="Previous level">← <span>Prev</span></button><span>← → / A D to move<br>↑ ↓ / W S to travel</span><button type="button" class="world-next" aria-label="Next level"><span>Next</span> →</button></div>
            </div><div class="world-level-panel"><span class="world-eyebrow world-level-number"></span><h3 class="world-level-title"></h3><p class="world-level-summary"></p><span class="world-level-status"></span><button type="button" class="world-enter"></button><p class="world-objective">Your mission: explore all 14 projects. Each first visit earns 25 XP. Finish a region to earn its badge.</p></div></div>
            <div class="world-achievements" role="group" aria-label="Exploration achievements">${Array.from({length: 5}, () => '<span class="world-badge"></span>').join('')}</div>
            <div class="world-bottom"><p class="world-save-note"></p><details><summary>Adventure settings</summary><p>Reset this browser’s XP and badges to start again.</p><button type="button" class="world-reset">Reset exploration progress</button></details></div>
            <p class="world-live" role="status" aria-live="polite" aria-atomic="true"></p>`;
        document.querySelector('#main').prepend(world);
        liveStatus = world.querySelector('.world-live');
        world.querySelectorAll('.world-regions button').forEach(button => button.addEventListener('click', () => travel(button.dataset.region)));
        const move = direction => {
            const list = regionLevels();
            const index = list.findIndex(level => level.file === state.selected);
            select(list[(index + direction + list.length) % list.length].file);
        };
        world.querySelector('.world-prev').addEventListener('click', () => move(-1));
        world.querySelector('.world-next').addEventListener('click', () => move(1));
        world.querySelector('.world-enter').addEventListener('click', enterLevel);
        world.querySelector('.world-start').addEventListener('click', () => {
            state.active = true;
            save();
            makeShortcut();
            update();
            announce('Adventure started. Choose a level, then enter it to earn your first 25 XP.');
            world.querySelector('.world-stage').focus();
        });
        world.querySelector('.world-stage').addEventListener('keydown', event => {
            if (event.ctrlKey || event.altKey || event.metaKey) return;
            const key = event.key.toLowerCase();
            if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', 'enter'].includes(key)) event.preventDefault();
            if (['arrowleft', 'a'].includes(key)) move(-1);
            else if (['arrowright', 'd'].includes(key)) move(1);
            else if (['arrowup', 'arrowdown', 'w', 's'].includes(key)) {
                const index = regions.findIndex(region => region.id === state.region);
                const direction = ['arrowup', 'w'].includes(key) ? -1 : 1;
                travel(regions[(index + direction + regions.length) % regions.length].id, true);
            } else if (key === 'enter') enterLevel();
        });
        world.querySelector('.world-reset').addEventListener('click', () => {
            state = emptyState();
            save();
            shortcut?.remove();
            shortcut = null;
            drawMap();
            update();
            announce('Exploration progress reset. Ready for a fresh adventure.');
        });
        const heroActions = document.querySelector('#intro .actions');
        if (heroActions) {
            const action = document.createElement('li');
            action.innerHTML = '<a class="button world-hero-link" href="#world">Explore project world →</a>';
            heroActions.append(action);
        }
        drawMap();
        update();
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                worldVisible = entries[0].isIntersecting;
                if (shortcut) shortcut.hidden = worldVisible;
            });
            observer.observe(world);
        }
    }
    function makeShortcut() {
        if (!state.active || shortcut) return;
        shortcut = document.createElement('a');
        shortcut.className = 'world-shortcut';
        shortcut.href = currentLevel ? 'index.html#world' : '#world';
        shortcut.textContent = 'World map · ' + xp() + ' XP';
        shortcut.hidden = worldVisible;
        document.body.append(shortcut);
    }
    if (currentLevel && state.active) {
        const firstVisit = !state.visited.includes(currentLevel.file);
        if (firstVisit) state.visited.push(currentLevel.file);
        state.region = currentLevel.region;
        state.selected = currentLevel.file;
        save();
        const banner = document.createElement('div');
        banner.className = 'world-visit-banner';
        const message = document.createElement('span');
        message.textContent = firstVisit ? '+25 XP · Level ' + (levels.indexOf(currentLevel) + 1) + ' explored!' : 'Level already explored · ' + xp() + ' XP';
        const link = document.createElement('a');
        link.href = 'index.html#world';
        link.textContent = 'Return to world →';
        banner.append(message, link);
        document.querySelector('#main > article')?.prepend(banner);
        pendingMessage = firstVisit ? message.textContent : '';
    }
    if (document.querySelector('#intro')) makeWorld();
    makeShortcut();
    if (pendingMessage) {
        const status = document.createElement('p');
        status.className = 'world-live';
        status.setAttribute('role', 'status');
        document.body.append(status);
        requestAnimationFrame(() => { status.textContent = pendingMessage; });
    }
    function syncProgress() {
        state = readState();
        if (!state.active) { shortcut?.remove(); shortcut = null; }
        makeShortcut();
        if (world) { drawMap(); update(); }
    }
    window.addEventListener('storage', event => {
        if (event.key !== storageKey && event.key !== null) return;
        syncProgress();
    });
    // Browser Back can restore the map without rerunning this script.
    window.addEventListener('pageshow', event => {
        if (event.persisted) syncProgress();
    });
})();
