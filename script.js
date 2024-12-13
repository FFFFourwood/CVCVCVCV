document.addEventListener('DOMContentLoaded', () => {
    // Ensure scroll to top when page loads
    window.scrollTo(0, 0);
    
    const letters = document.querySelectorAll('.letter');
    const lines = document.querySelectorAll('.line');
    const finalText = document.querySelector('.final-text');
    const totalSections = letters.length;

    // Easing function
    function easeOutQuart(x) {
        return 1 - Math.pow(1 - x, 4);
    }

    // Color interpolation function
    function interpolateColor(color1, color2, factor) {
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);

        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);

        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // Initial animation sequence
    function playInitialAnimation() {
        document.body.style.background = 'white';

        setTimeout(() => {
            document.body.style.transition = 'background-color 2s ease';
            document.body.style.background = letters[0].dataset.startColor;

            setTimeout(() => {
                letters[0].style.transition = 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
                letters[0].style.opacity = 1;
                letters[0].style.transform = 'translateX(0)';
            }, 1000);
        }, 1000);
    }

    let physicsInitialized = false;
    let engine, render, world, letterBodies;

    function initPhysics() {
        // Initialize physics engine
        engine = Matter.Engine.create({
            positionIterations: 8,
            velocityIterations: 6,
            enableSleeping: true
        });
        world = engine.world;
        world.gravity.y = 0.6;

        // Detect device type and adjust parameters
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const letterSpacing = isMobile ? 60 : 90;
        const fontSize = isMobile ? 50 : 80;

        // Create boundaries
        const ground = Matter.Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 30, window.innerWidth, 60, {
            isStatic: true,
            render: { visible: false }
        });
        const leftWall = Matter.Bodies.rectangle(-30, window.innerHeight / 2, 60, window.innerHeight, {
            isStatic: true,
            render: { visible: false }
        });
        const rightWall = Matter.Bodies.rectangle(window.innerWidth + 30, window.innerHeight / 2, 60, window.innerHeight, {
            isStatic: true,
            render: { visible: false }
        });
        Matter.World.add(world, [ground, leftWall, rightWall]);

        // Create physics bodies for letters
        const text = "CVCVCVCV.CV";
        letterBodies = Array.from(text).map((char, index) => {
            const x = window.innerWidth / 2 - (text.length * letterSpacing) / 2 + index * letterSpacing;
            const y = window.innerHeight / 2;
            const body = Matter.Bodies.rectangle(x, y, 70, 90, {
                render: { fillStyle: '#ffcfdf' },
                chamfer: { radius: 10 },
                density: 0.0015,
                friction: 0.05,
                restitution: 0.7,
                torque: 0.002
            });
            body.letter = char;
            body.isLetter = true;
            return body;
        });

        Matter.World.add(world, letterBodies);

        // Create canvas and add touch support
        const canvas = document.createElement('canvas');
        canvas.className = 'physics-canvas';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.pointerEvents = 'auto';
        document.body.appendChild(canvas);

        // Setup mouse constraints with touch support
        const mouse = Matter.Mouse.create(canvas);
        const mouseConstraint = Matter.MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false }
            }
        });

        // Add touch event handlers
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            mouse.position.x = touch.clientX;
            mouse.position.y = touch.clientY;
        }, { passive: false });

        Matter.World.add(world, mouseConstraint);

        function updatePhysics() {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Enable high-quality rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Add random bouncing effect
            if (Math.random() < 0.01) {
                const randomBody = letterBodies[Math.floor(Math.random() * letterBodies.length)];
                Matter.Body.applyForce(randomBody, 
                    randomBody.position, 
                    { x: (Math.random() - 0.5) * 0.05, y: -0.1 }
                );
            }

            letterBodies.forEach(body => {
                ctx.save();
                ctx.translate(body.position.x, body.position.y);
                ctx.rotate(body.angle);
                
                // Letter shadow effect
                ctx.shadowColor = 'rgba(0,0,0,0.15)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 4;
                ctx.shadowOffsetY = 4;
                
                // Letter main body
                ctx.font = `bold ${fontSize}px Arial Black, Helvetica Neue, sans-serif`;
                
                // Gradient effect
                const gradient = ctx.createLinearGradient(0, -fontSize/2, 0, fontSize/2);
                gradient.addColorStop(0, '#ffcfdf');
                gradient.addColorStop(1, '#fefdca');
                ctx.fillStyle = gradient;
                
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Draw stroke first
                ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                ctx.lineWidth = 4;
                ctx.strokeText(body.letter, 0, 0);
                
                // Then draw text
                ctx.fillText(body.letter, 0, 0);

                ctx.restore();
            });

            requestAnimationFrame(updatePhysics);
        }

        // Optimize mouse interaction
        canvas.addEventListener('mousemove', (e) => {
            const mousePosition = { x: e.clientX, y: e.clientY };
            const hovering = letterBodies.some(body => {
                return Matter.Bounds.contains(body.bounds, mousePosition);
            });
            canvas.classList.toggle('hovering', hovering);
        });

        // Mouse drag events
        Matter.Events.on(mouseConstraint, 'startdrag', () => {
            canvas.classList.remove('hovering');
            canvas.classList.add('dragging');
        });

        Matter.Events.on(mouseConstraint, 'enddrag', () => {
            canvas.classList.remove('dragging');
        });

        Matter.Engine.run(engine);
        updatePhysics();

        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                Matter.Body.setPosition(ground, {
                    x: window.innerWidth / 2,
                    y: window.innerHeight + 30
                });
            }, 250);
        });
    }

    // Update scene based on scroll position
    function updateScene() {
        const scrollProgress = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
        const currentSection = Math.floor(scrollProgress * totalSections);
        const sectionProgress = (scrollProgress * totalSections) % 1;
        const easedProgress = easeOutQuart(sectionProgress);

        if (scrollProgress >= 0.95) {
            const finalProgress = (scrollProgress - 0.95) / 0.05;
            finalText.style.opacity = finalProgress;
            finalText.style.transform = `translate(-50%, -50%)`;
            
            letters.forEach(letter => {
                letter.style.opacity = Math.max(0, 1 - finalProgress * 2);
            });

            if (finalProgress >= 1 && !physicsInitialized) {
                // Disable scrolling
                document.body.style.overflow = 'hidden';
                // Initialize physics effect
                physicsInitialized = true;
                initPhysics();
                // Hide original text
                finalText.style.display = 'none';
                return;
            }
        } else {
            finalText.style.opacity = 0;
            letters.forEach((letter, index) => {
                const startColor = letter.dataset.startColor;
                const endColor = letter.dataset.endColor;

                if (index === currentSection) {
                    const translateX = easedProgress * 30;
                    letter.style.transform = `translateX(${translateX}vw)`;
                    letter.style.opacity = 1 - easedProgress;

                    document.body.style.background = interpolateColor(startColor, endColor, easedProgress);
                } else if (index === currentSection + 1) {
                    const translateX = (1 - easedProgress) * 30;
                    letter.style.transform = `translateX(${translateX}vw)`;
                    letter.style.opacity = easedProgress;
                } else {
                    letter.style.opacity = 0;
                    letter.style.transform = 'translateX(30vw)';
                }
            });
        }

        // Update decoration lines
        lines.forEach((line, index) => {
            line.style.opacity = 0.1 + Math.sin(scrollProgress * Math.PI) * 0.05;
        });
    }

    // Initialize state
    function initializeState() {
        // Force scroll to top
        window.scrollTo(0, 0);
        
        // Reset background
        document.body.style.background = 'white';
        document.body.style.transition = 'none';
        
        // Reset all letters
        letters.forEach(letter => {
            letter.style.opacity = 0;
            letter.style.transform = 'translateX(30vw)';
            letter.style.transition = 'none';
        });
        
        // Reset final text
        finalText.style.opacity = 0;
        finalText.style.transform = 'translate(-50%, -50%)';
        
        // Reset physics engine state
        physicsInitialized = false;
        
        // Remove existing canvas if any
        const existingCanvas = document.querySelector('.physics-canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }
        
        // Enable scrolling
        document.body.style.overflow = 'auto';
    }

    // Initialize state on page load and refresh
    initializeState();
    
    // Add page refresh event listener
    window.addEventListener('beforeunload', () => {
        window.scrollTo(0, 0);
    });

    // Start animation with delay
    setTimeout(playInitialAnimation, 100);

    // Optimize scroll performance
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateScene();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}); 