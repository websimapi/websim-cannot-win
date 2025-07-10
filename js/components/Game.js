const { useState, useEffect, useRef, useCallback } = React;

function Game() {
    const gameAreaRef = useRef(null);
    const playerRef = useRef(null);
    
    const [playerState, setPlayerState] = useState({
        x: -100, // Start off-screen
        y: -100,
        vx: 0,
        vy: 0,
        grounded: false,
        health: 1 // Max health is 1 (100%)
    });
    const [gameScale, setGameScale] = useState(1);
    const [initialized, setInitialized] = useState(false);
    const keysPressed = useRef({});
    const [healthOrbs, setHealthOrbs] = useState([]);

    const collectSound = useRef(null);

    useEffect(() => {
        // Pre-create the audio buffer for the collect sound to avoid re-creating it on every collection
        const createCollectSound = async () => {
            if (AudioManager.isInitialized()) {
                collectSound.current = await AudioManager.createSoundBufferFromFrequency(440, 0.1, 'sine', 0.2);
            }
        };
        createCollectSound();
    }, []);

    // Orb Spawning Timer
    useEffect(() => {
        if (!initialized) return;

        const orbSpawner = setInterval(() => {
            if (!gameAreaRef.current) return;
            const gameAreaWidth = gameAreaRef.current.offsetWidth;
            const gameAreaHeight = gameAreaRef.current.offsetHeight;
            const spawnBoxSize = Math.max(gameAreaWidth, gameAreaHeight) * 2.5;

            // Spawn orbs in a large area around the game's center, with coordinates relative to the game area
            const newOrb = {
                id: Date.now(),
                x: (gameAreaWidth / 2) + (Math.random() - 0.5) * spawnBoxSize,
                y: (gameAreaHeight / 2) + (Math.random() - 0.5) * spawnBoxSize,
            };

            setHealthOrbs(orbs => [...orbs, newOrb]);
        }, 5000); // Spawn every 5 seconds

        return () => clearInterval(orbSpawner);
    }, [initialized]);

    // Health Drain Timer
    useEffect(() => {
        if (!initialized) return;

        const healthDrainInterval = setInterval(() => {
            setPlayerState(p => {
                if (p.health <= 0) return p;
                return {
                    ...p,
                    health: Math.max(0, p.health - 0.1)
                };
            });
        }, 3000); // lose 0.1 health every 3 seconds

        return () => clearInterval(healthDrainInterval);
    }, [initialized]);

    useEffect(() => {
        const handleKeyDown = (e) => { keysPressed.current[e.code] = true; };
        const handleKeyUp = (e) => { keysPressed.current[e.code] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const gameLoop = useCallback(() => {
        if (!gameAreaRef.current) return;

        const gameAreaWidth = gameAreaRef.current.offsetWidth;
        const gameAreaHeight = gameAreaRef.current.offsetHeight;
        
        const planetCenter = {
            x: gameAreaWidth / 2,
            y: gameAreaHeight / 2
        };
        const playerSize = 30;
        const orbSize = 20;

        let orbsCollectedCount = 0;
        let newHealthOrbs = [...healthOrbs];

        setPlayerState(p => {
            let { x, y, vx, vy, health } = p;
            
            // --- Orb collection logic ---
            const playerCenterX = x + playerSize / 2;
            const playerCenterY = y + playerSize / 2;
            
            const remainingOrbs = [];
            for(const orb of newHealthOrbs) {
                const orbCenterX = orb.x + orbSize / 2;
                const orbCenterY = orb.y + orbSize / 2;

                const dx = playerCenterX - orbCenterX;
                const dy = playerCenterY - orbCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const collisionDistance = (playerSize / 2) + (orbSize / 2);

                if (distance < collisionDistance) {
                    orbsCollectedCount++;
                } else {
                    remainingOrbs.push(orb);
                }
            }

            if(orbsCollectedCount > 0) {
                newHealthOrbs = remainingOrbs;
                health = Math.min(1, health + (0.1 * orbsCollectedCount));
                if (collectSound.current) {
                    AudioManager.playSoundBuffer(collectSound.current);
                }
            }
            // --- End orb collection ---

            // Gravity
            const gravity = 0.3;
            const gravDx = planetCenter.x - (x + playerSize / 2);
            const gravDy = planetCenter.y - (y + playerSize / 2);
            const dist = Math.sqrt(gravDx * gravDx + gravDy * gravDy);
            
            if (dist > 0) {
                vx += (gravDx / dist) * gravity;
                vy += (gravDy / dist) * gravity;
            }

            // Controls
            const moveForce = 0.8;
            if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) vy -= moveForce;
            if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) vy += moveForce;
            if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) vx -= moveForce;
            if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) vx += moveForce;

            // Drag
            vx *= 0.98;
            vy *= 0.98;
            
            // Update position
            x += vx;
            y += vy;
            
            // Collision detection with planet
            let grounded = false;
            // Simplified boundary check, assuming planet is the game area for now
            if (x < 0) { x = 0; vx = 0; }
            if (y < 0) { y = 0; vy = 0; }
            if (x + playerSize > gameAreaWidth) { x = gameAreaWidth - playerSize; vx = 0; }
            if (y + playerSize > gameAreaHeight) { y = gameAreaHeight - playerSize; vy = 0; grounded = true; } // simplistic grounded check

            return { x, y, vx, vy, grounded, health };
        });

        if (orbsCollectedCount > 0) {
            setHealthOrbs(newHealthOrbs);
        }

        // --- Scale calculation ---
        setPlayerState(p => {
            const playerDistX = p.x + playerSize / 2;
            const playerDistY = p.y + playerSize / 2;

            const distanceFromCenter = Math.sqrt(
                Math.pow(playerDistX - planetCenter.x, 2) + 
                Math.pow(playerDistY - planetCenter.y, 2)
            );
            
            const maxDistance = Math.max(gameAreaWidth, gameAreaHeight);
            const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1);
            const minScale = 0.4;
            const maxScale = 1.2;
            const targetScale = maxScale - (normalizedDistance * (maxScale - minScale));
            
            setGameScale(prevScale => {
                const scaleDiff = targetScale - prevScale;
                return prevScale + scaleDiff * 0.1;
            });
            return p;
        });

    }, [healthOrbs, initialized]);

    useEffect(() => {
        if (!initialized) return;

        let animationFrameId;

        const runGameLoop = () => {
            gameLoop();
            animationFrameId = requestAnimationFrame(runGameLoop);
        };

        runGameLoop();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [initialized, gameLoop]);

    return (
        <>
            <main ref={gameAreaRef} style={{
                transform: `scale(${gameScale})`,
                transformOrigin: 'center',
                transition: 'transform 0.1s ease-out'
            }}>
                {healthOrbs.map(orb => (
                    <div
                        key={orb.id}
                        className="health-orb"
                        style={{
                            transform: `translate(${orb.x}px, ${orb.y}px)`
                        }}
                    ></div>
                ))}
                <div ref={playerRef} className="player" style={{
                    transform: `translate(${playerState.x}px, ${playerState.y}px)`
                }}></div>
                <div className="health-bar-container">
                    <div className="health-bar" style={{ width: `${playerState.health * 100}%` }}></div>
                </div>
                <h1>You Just Lost The Game</h1>
            </main>
        </>
    );
}