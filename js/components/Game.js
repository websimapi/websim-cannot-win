const { useState, useEffect, useRef, useCallback } = React;

const HealthBar = ({ health }) => {
    const maxHealth = 10;
    const healthPercentage = (health / maxHealth) * 100;

    return (
        <div className="health-bar-container">
            <div className="health-bar" style={{ width: `${healthPercentage}%` }}></div>
        </div>
    );
};

const Orb = ({ orb }) => {
    return (
        <div
            className="orb"
            style={{
                transform: `translate(${orb.x}px, ${orb.y}px)`,
            }}
        ></div>
    );
};

function Game() {
    const gameAreaRef = useRef(null);
    const playerRef = useRef(null);
    
    const [playerState, setPlayerState] = useState({
        x: -100, // Start off-screen
        y: -100,
        vx: 0,
        vy: 0,
        grounded: false
    });
    const [health, setHealth] = useState(10.0);
    const [orbs, setOrbs] = useState([]);

    const [gameScale, setGameScale] = useState(1);
    const [initialized, setInitialized] = useState(false);
    const keysPressed = useRef({});

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

    // Health decay and orb spawning timers
    useEffect(() => {
        if (!initialized) return;

        const healthInterval = setInterval(() => {
            setHealth(h => Math.max(0, h - 0.1));
        }, 3000);

        const orbInterval = setInterval(() => {
            if (!gameAreaRef.current) return;
            // Spawning logic uses offsetWidth which will now be the full window width, which is fine.
            const gameAreaWidth = gameAreaRef.current.offsetWidth;
            const gameAreaHeight = gameAreaRef.current.offsetHeight;

            // Spawn orbs within a larger area than the initial view
            const spawnRadiusX = gameAreaWidth * 2;
            const spawnRadiusY = gameAreaHeight * 2;
            
            // Center the spawn area around the game area center
            const spawnCenterX = gameAreaWidth / 2;
            const spawnCenterY = gameAreaHeight / 2;

            const newOrb = {
                id: Date.now() + Math.random(),
                x: Math.random() * spawnRadiusX - (spawnRadiusX / 2) + spawnCenterX,
                y: Math.random() * spawnRadiusY - (spawnRadiusY / 2) + spawnCenterY,
            };
            setOrbs(prevOrbs => [...prevOrbs, newOrb]);
        }, 3000);

        return () => {
            clearInterval(healthInterval);
            clearInterval(orbInterval);
        };
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
            // These will now refer to the whole window.
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

                // Orb Collision
                const orbSize = 15;
                const playerCenterX = x + playerSize / 2;
                const playerCenterY = y + playerSize / 2;

                setOrbs(currentOrbs => {
                    const remainingOrbs = [];
                    let healthGained = 0;
                    for (const orb of currentOrbs) {
                        const orbCenterX = orb.x + orbSize / 2;
                        const orbCenterY = orb.y + orbSize / 2;
                        const distBetween = Math.sqrt(
                            Math.pow(playerCenterX - orbCenterX, 2) +
                            Math.pow(playerCenterY - orbCenterY, 2)
                        );
                        if (distBetween < (playerSize / 2) + (orbSize / 2)) {
                           healthGained += 0.1;
                        } else {
                            remainingOrbs.push(orb);
                        }
                    }
                    if(healthGained > 0) {
                        setHealth(h => Math.min(10.0, h + healthGained));
                    }
                    return remainingOrbs;
                });
                
                // Drag
                vx *= 0.98;
                vy *= 0.98;

                // Calculate zoom based on distance from planet center
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

                // Controls
                const moveForce = 0.8; // Reduced force for finer control
                if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) vy -= moveForce;
                if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) vy += moveForce;
                if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) vx -= moveForce;
                if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) vx += moveForce;

                return { x, y, vx, vy, grounded: false }; // Grounded is always false now
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
            <div
                ref={gameAreaRef}
                className="game-world"
                style={{
                    transform: `scale(${gameScale}) translate(-50%, -50%)`,
                    transformOrigin: 'top left',
                }}
            >
                {orbs.map(orb => <Orb key={orb.id} orb={orb} />)}
                <div ref={playerRef} className="player" style={{
                    transform: `translate(${playerState.x}px, ${playerState.y}px)`
                }}></div>
            </div>
            <main>
                <div className="game-ui">
                    <HealthBar health={health} />
                    <h1>You Just Lost The Game</h1>
                </div>
            </main>
        </>
    );
}