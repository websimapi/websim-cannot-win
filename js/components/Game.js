const { useState, useEffect, useRef } = React;

function Game({ maxHealth }) {
    const gameAreaRef = useRef(null);
    const playerRef = useRef(null);
    const [health, setHealth] = useState(maxHealth);
    const [orbs, setOrbs] = useState([]);
    
    const [playerState, setPlayerState] = useState({
        x: -100, // Start off-screen
        y: -100,
        vx: 0,
        vy: 0,
        grounded: false
    });
    const [gameScale, setGameScale] = useState(1);
    const [initialized, setInitialized] = useState(false);
    const keysPressed = useRef({});

    useEffect(() => {
        setHealth(maxHealth);
    }, [maxHealth]);

    useEffect(() => {
        if (gameAreaRef.current && !initialized) {
            const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
            setPlayerState({
                x: gameAreaRect.width / 2 - 15, // Center horizontally relative to gameArea
                y: -50, // Start 50px above the game area, relative to it
                vx: 0,
                vy: 0,
                grounded: false
            });
            setInitialized(true);
        }
    }, [initialized]);
    
    useEffect(() => {
        if (!initialized) return;

        const MAX_ORBS = 15;
        const ORB_SPAWN_RATE = 2000; // ms

        const spawnOrb = () => {
            if (!gameAreaRef.current) return;

            setOrbs(prevOrbs => {
                if (prevOrbs.length >= MAX_ORBS) {
                    return prevOrbs;
                }
                const gameAreaWidth = gameAreaRef.current.offsetWidth;
                const gameAreaHeight = gameAreaRef.current.offsetHeight;

                const newOrb = {
                    id: Date.now() + Math.random(),
                    x: Math.random() * gameAreaWidth,
                    y: Math.random() * gameAreaHeight,
                    vx: (Math.random() - 0.5) * 1,
                    vy: (Math.random() - 0.5) * 1
                };
                return [...prevOrbs, newOrb];
            });
        };

        const intervalId = setInterval(spawnOrb, ORB_SPAWN_RATE);
        return () => clearInterval(intervalId);

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

        let lastTime = performance.now();
        let animationFrameId;

        const gameLoop = (currentTime) => {
            if (!gameAreaRef.current) return;
            const deltaTime = (currentTime - lastTime) / 1000; // time in seconds
            lastTime = currentTime;

            // Health depletion over time
            setHealth(h => Math.max(0, h - (deltaTime * 0.5))); // Health decreases over time

            // Use offsetWidth and offsetHeight for consistent dimensions.
            const gameAreaWidth = gameAreaRef.current.offsetWidth;
            const gameAreaHeight = gameAreaRef.current.offsetHeight;
            
            const planetCenter = {
                x: gameAreaWidth / 2, // relative to gameArea
                y: gameAreaHeight / 2 // relative to gameArea
            };
            const playerSize = 30;

            setPlayerState(p => {
                let { x, y, vx, vy } = p;
                
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

                // Calculate zoom based on distance from planet center
                const playerCenterX = x + playerSize / 2;
                const playerCenterY = y + playerSize / 2;
                const distanceFromCenter = Math.sqrt(
                    Math.pow(playerCenterX - planetCenter.x, 2) + 
                    Math.pow(playerCenterY - planetCenter.y, 2)
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

                return { x, y, vx, vy, grounded };
            });

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        animationFrameId = requestAnimationFrame(gameLoop);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [initialized, maxHealth]);

    return (
        <>
            <main ref={gameAreaRef} style={{
                transform: `scale(${gameScale})`,
                transformOrigin: 'center',
                transition: 'transform 0.1s ease-out'
            }}>
                <div className="health-bar-container">
                    <div className="health-bar" style={{ width: `${(health / maxHealth) * 100}%` }}></div>
                </div>
                {orbs.map(orb => (
                    <div key={orb.id} className="orb" style={{
                        transform: `translate(${orb.x}px, ${orb.y}px)`
                    }}></div>
                ))}
                <div ref={playerRef} className="player" style={{
                    transform: `translate(${playerState.x}px, ${playerState.y}px)`
                }}></div>
                <h1>You Just Lost The Game</h1>
            </main>
        </>
    );
}