const { useState, useEffect, useRef } = React;

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

    useEffect(() => {
        if (gameAreaRef.current && !initialized) {
            const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
            setPlayerState(p => ({
                ...p,
                x: gameAreaRect.width / 2 - 15, // Center horizontally relative to gameArea
                y: -50, // Start 50px above the game area, relative to it
            }));
            setInitialized(true);
        }
    }, [initialized]);

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

    useEffect(() => {
        if (!initialized) return;

        let animationFrameId;

        const gameLoop = () => {
            if (!gameAreaRef.current) return;

            // Use offsetWidth and offsetHeight for consistent dimensions.
            const gameAreaWidth = gameAreaRef.current.offsetWidth;
            const gameAreaHeight = gameAreaRef.current.offsetHeight;
            
            const planetCenter = {
                x: gameAreaWidth / 2, // relative to gameArea
                y: gameAreaHeight / 2 // relative to gameArea
            };
            const playerSize = 30;
            const orbSize = 20;

            setPlayerState(p => {
                let { x, y, vx, vy, health } = p;
                
                // Gravity
                const gravity = 0.3; // slightly reduced for better control
                const dx = planetCenter.x - (x + playerSize / 2);
                const dy = planetCenter.y - (y + playerSize / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    vx += (dx / dist) * gravity;
                    vy += (dy / dist) * gravity;
                }

                // Update position first
                x += vx;
                y += vy;
                
                // Drag
                vx *= 0.98;
                vy *= 0.98;

                // Orb collection
                // Both player and orbs are in the same game-world coordinate system now.
                const playerCenterX = x + playerSize / 2;
                const playerCenterY = y + playerSize / 2;
                
                const remainingOrbs = [];
                let collectedAny = false;
                for(const orb of healthOrbs) {
                    const orbCenterX = orb.x + orbSize / 2;
                    const orbCenterY = orb.y + orbSize / 2;

                    const dx = playerCenterX - orbCenterX;
                    const dy = playerCenterY - orbCenterY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const collisionDistance = (playerSize / 2) + (orbSize / 2);

                    if (distance < collisionDistance) {
                        collectedAny = true;
                    } else {
                        remainingOrbs.push(orb);
                    }
                }

                if(collectedAny) {
                    health = Math.min(1, health + 0.1);
                    setHealthOrbs(remainingOrbs);
                }

                // Calculate zoom based on distance from planet center
                const playerDistX = x + playerSize / 2;
                const playerDistY = y + playerSize / 2;

                const distanceFromCenter = Math.sqrt(
                    Math.pow(playerDistX - planetCenter.x, 2) + 
                    Math.pow(playerDistY - planetCenter.y, 2)
                );
                
                // Scale calculation: closer = larger scale (zoomed in), farther = smaller scale (zoomed out)
                const maxDistance = Math.max(gameAreaWidth, gameAreaHeight);
                const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1);
                const minScale = 0.4; // Don't zoom out too much
                const maxScale = 1.2; // Allow slight zoom in when very close
                const targetScale = maxScale - (normalizedDistance * (maxScale - minScale));
                
                // Smooth scale transition
                setGameScale(prevScale => {
                    const scaleDiff = targetScale - prevScale;
                    return prevScale + scaleDiff * 0.1; // Smooth interpolation
                });

                // Collision detection with planet
                let grounded = false;
                const playerRect = {
                    left: x,
                    right: x + playerSize,
                    top: y,
                    bottom: y + playerSize
                };

                const planetRect = {
                    left: 0,
                    right: gameAreaWidth,
                    top: 0,
                    bottom: gameAreaHeight
                };

                const isColliding = playerRect.right > planetRect.left &&
                                  playerRect.left < planetRect.right &&
                                  playerRect.bottom > planetRect.top &&
                                  playerRect.top < planetRect.bottom;

                if (isColliding) {
                    grounded = true;
                   
                    const penLeft = playerRect.right - planetRect.left;
                    const penRight = planetRect.right - playerRect.left;
                    const penTop = playerRect.bottom - planetRect.top;
                    const penBottom = planetRect.bottom - playerRect.top;

                    const minPen = Math.min(penLeft, penRight, penTop, penBottom);

                    if (minPen === penTop) { // Colliding with top edge
                        y = planetRect.top - playerSize;
                        vy = 0;
                    } else if (minPen === penBottom) { // Colliding with bottom edge
                        y = planetRect.bottom;
                        vy = 0;
                    } else if (minPen === penLeft) { // Colliding with left edge
                        x = planetRect.left - playerSize;
                        vx = 0;
                    } else { // Colliding with right edge
                        x = planetRect.right;
                        vx = 0;
                    }
                }

                // Controls
                const moveForce = 0.8; // Reduced force for finer control
                if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) vy -= moveForce;
                if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) vy += moveForce;
                if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) vx -= moveForce;
                if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) vx += moveForce;

                return { x, y, vx, vy, grounded, health };
            });

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        gameLoop();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [initialized]);

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