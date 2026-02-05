document.addEventListener('DOMContentLoaded', () => {
    createSnow();
});

function createSnow() {
    const container = document.getElementById('snow-container');
    const snowflakeCount = 50;

    for (let i = 0; i < snowflakeCount; i++) {
        const snowflake = document.createElement('div');
        setupSnowflake(snowflake);
        container.appendChild(snowflake);
    }
}

function setupSnowflake(el) {
    el.innerHTML = '❄';
    el.style.position = 'absolute';
    el.style.color = 'white';
    el.style.textShadow = '0 0 5px #B3E5FC';
    el.style.userSelect = 'none';
    el.style.top = '-20px'; // Start above screen

    // Randomize initial properties
    resetSnowflake(el);

    // Animate manually to avoid complex CSS keyframe management for random properties
    animateSnowflake(el);
}

function resetSnowflake(el) {
    const x = Math.random() * window.innerWidth;
    const size = Math.random() * 20 + 10; // 10px to 30px
    const duration = Math.random() * 5 + 5; // 5s to 10s
    const delay = Math.random() * 5;

    el.style.left = `${x}px`;
    el.style.fontSize = `${size}px`;
    el.style.opacity = Math.random() * 0.7 + 0.3;

    el.dataset.speed = (Math.random() * 1 + 0.5).toString(); // Fall speed
    el.dataset.sway = (Math.random() * 2 - 1).toString(); // Horizontal sway
    el.dataset.y = (-50).toString(); // Reset Y position
    el.dataset.x = x.toString();
}

function animateSnowflake(el) {
    let y = parseFloat(el.dataset.y);
    let x = parseFloat(el.dataset.x);
    let speed = parseFloat(el.dataset.speed);
    let sway = parseFloat(el.dataset.sway);

    // Update position
    y += speed;
    x += Math.sin(y / 50) * sway; // Sway effect

    // Reset if out of view
    if (y > window.innerHeight + 50) {
        resetSnowflake(el);
        y = -50;
    }

    // Apply styles
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.dataset.y = y.toString();
    el.dataset.x = x.toString();

    requestAnimationFrame(() => animateSnowflake(el));
}

document.addEventListener('scroll', () => {
    const trainSection = document.getElementById('train-section');
    const trainContainer = document.getElementById('train-container');

    if (!trainSection || !trainContainer) return;

    const rect = trainSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Check if section is in view
    if (rect.top < windowHeight && rect.bottom > 0) {
        // Calculate progress: 0 when top enters bottom of screen, 1 when bottom leaves top of screen
        // Adjusting for better visual duration
        const scrollDistance = windowHeight + rect.height;
        const scrolled = windowHeight - rect.top;
        let percentage = scrolled / scrollDistance;

        // Clamp percentage 0-1
        percentage = Math.max(0, Math.min(1, percentage));

        // Move train from left (-300px) to right (screen width)
        // We want it to traverse the whole width + its own width
        const totalDistance = window.innerWidth + 400 + 300; // Screen + train width + start offset
        const moveX = (totalDistance * percentage);

        trainContainer.style.transform = `translateX(${moveX}px)`;


    }
});




