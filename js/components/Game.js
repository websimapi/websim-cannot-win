const { useState, useEffect, useRef, useCallback } = React;

const WORLD_WIDTH = 8000;
const WORLD_HEIGHT = 8000;

// The central "planet" is not the entire game world.
// It's a smaller object in the center. Let's define its size.
const PLANET_WIDTH = 600;
const PLANET_HEIGHT = 400;

const HealthBar = ({ health }) => {
    const maxHealth = 10;
    const healthPercentage = (health / maxHealth) * 100;

    return (
        <div className="health-bar-container">
            <div className="health-bar" style={{ width: `${healthPercentage}%` }}></div>
        </div>
    );
};

const Orb = ({ orb, camera }) => {
    // Convert world coords to screen coords
    const screenX = orb.x - camera.x;
    const screenY = orb.y - camera.y;

    return (
        <div
            className="orb"
            style={{
                transform: `translate(${screenX}px, ${screenY}px)`,
            }}
        ></div>
    );
};

function Game() {
    const gameAreaRef = useRef(null);
    const playerRef = useRef(null);
    
    const [playerState, setPlayerState] = useState({
        x: WORLD_WIDTH / 2, // Start at world center
        y: WORLD_HEIGHT / 2,
        vx: 0,
        vy: 0,
    });
    const [camera, setCamera] = useState({ 
        x: playerState.x, 
        y: playerState.y 
    });
    const [health, setHealth] = useState(10.0);
    const [orbs, setOrbs] = useState([]);

    const [gameScale, setGameScale] = useState(1);
    const [initialized, setInitialized] = useState(false);
    const keysPressed = useRef({});
    const joystickInput = useRef({ x: 0, y: 0 });

    const isTouchDevice = 'ontouchstart' in window;

    // Joystick handler
    const handleJoystickMove = useCallback((vec) => {
        joystickInput.current = vec;
    }, []);

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

    useEffect(() => {
        const handleResize = () => {
             if (gameAreaRef.current) {
                // This is a dummy state update to force a re-render
                // which helps recalculating positions/dimensions if needed.
                setInitialized(val => !val);
                setInitialized(val => !val);
            }
        };

        window.addEventListener('resize', handleResize);
        // Initial setup
        setInitialized(true);
        handleResize(); // run once on mount

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Health decay and orb spawning timers
    useEffect(() => {
        if (!initialized) return;

        const healthInterval = setInterval(() => {
            setHealth(h => Math.max(0, h - 0.1));
        }, 3000);

        const orbInterval = setInterval(() => {
            // Spawn orbs within the fixed world dimensions
            const worldEdgeBuffer = 50; // Don't spawn at the very edge

            // The central planet area where orbs should not spawn
            const planetLeft = (WORLD_WIDTH - PLANET_WIDTH) / 2;
            const planetRight = planetLeft + PLANET_WIDTH;
            const planetTop = (WORLD_HEIGHT - PLANET_HEIGHT) / 2;
            const planetBottom = planetTop + PLANET_HEIGHT;
            
            let newOrbX, newOrbY;
            do {
                newOrbX = Math.random() * (WORLD_WIDTH - worldEdgeBuffer * 2) + worldEdgeBuffer;
                newOrbY = Math.random() * (WORLD_HEIGHT - worldEdgeBuffer * 2) + worldEdgeBuffer;
            } while (
                // Ensure it doesn't spawn inside the central planet area
                newOrbX > planetLeft && newOrbX < planetRight &&
                newOrbY > planetTop && newOrbY < planetBottom
            );

            const newOrb = {
                id: Date.now() + Math.random(),
                x: newOrbX,
                y: newOrbY,
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
            if (!gameAreaRef.current) {
                animationFrameId = requestAnimationFrame(gameLoop);
                return;
            };

            const playerSize = 30; // Player's visual size
            const worldCenterX = WORLD_WIDTH / 2;
            const worldCenterY = WORLD_HEIGHT / 2;

            setPlayerState(p => {
                let { x, y, vx, vy } = p;
                
                // Gravity towards the world center
                const gravity = 0.3;
                const dx = worldCenterX - x;
                const dy = worldCenterY - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 1) { // avoid division by zero
                    vx += (dx / dist) * gravity;
                    vy += (dy / dist) * gravity;
                }

                // Update position first
                x += vx;
                y += vy;
                
                // World boundary collision (bouncing)
                const bounceDamping = 0.8;
                if (x < playerSize / 2) {
                    x = playerSize / 2;
                    vx = -vx * bounceDamping;
                }
                if (x > WORLD_WIDTH - playerSize / 2) {
                    x = WORLD_WIDTH - playerSize / 2;
                    vx = -vx * bounceDamping;
                }
                if (y < playerSize / 2) {
                    y = playerSize / 2;
                    vy = -vy * bounceDamping;
                }
                 if (y > WORLD_HEIGHT - playerSize / 2) {
                    y = WORLD_HEIGHT - playerSize / 2;
                    vy = -vy * bounceDamping;
                }

                // Orb Collision (using world coordinates)
                const orbSize = 15;
                setOrbs(currentOrbs => {
                    const remainingOrbs = [];
                    let healthGained = 0;
                    for (const orb of currentOrbs) {
                        const distBetween = Math.sqrt(
                            Math.pow(x - orb.x, 2) +
                            Math.pow(y - orb.y, 2)
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

                // Controls
                const moveForce = 0.8; 
                if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) vy -= moveForce;
                if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) vy += moveForce;
                if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) vx -= moveForce;
                if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) vx += moveForce;
                
                // Joystick controls
                if (joystickInput.current.y !== 0) {
                    vy += joystickInput.current.y * moveForce;
                }
                if (joystickInput.current.x !== 0) {
                    vx += joystickInput.current.x * moveForce;
                }

                return { x, y, vx, vy };
            });

            // Update camera to smoothly follow player
            setCamera(c => ({
                x: c.x + (playerState.x - c.x) * 0.1,
                y: c.y + (playerState.y - c.y) * 0.1,
            }));
            
            // Calculate zoom based on distance from world center
            const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
            const distanceFromCenter = Math.sqrt(
                Math.pow(playerState.x - worldCenterX, 2) + 
                Math.pow(playerState.y - worldCenterY, 2)
            );
            
            const maxDistance = Math.max(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
            const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1);
            const minScale = 0.2; 
            const maxScale = 1.2; 
            const targetScale = maxScale - (normalizedDistance * (maxScale - minScale));
            
            setGameScale(prevScale => {
                const scaleDiff = targetScale - prevScale;
                return prevScale + scaleDiff * 0.1;
            });

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        gameLoop();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [initialized, handleJoystickMove]);

    // Calculate screen positions for rendering
    const gameAreaRect = gameAreaRef.current?.getBoundingClientRect() || { width: 0, height: 0 };
    const viewportCenterX = gameAreaRect.width / 2;
    const viewportCenterY = gameAreaRect.height / 2;

    const playerScreenX = viewportCenterX;
    const playerScreenY = viewportCenterY;
    
    // Position the world container (with the planet) based on camera
    const worldContainerX = viewportCenterX - camera.x;
    const worldContainerY = viewportCenterY - camera.y;

    return (
        <>
            <main ref={gameAreaRef} style={{
                // The main container no longer scales, only the inner world
                // It now acts as the viewport
            }}>
                <div className="world-container" style={{
                    transform: `translate(${worldContainerX}px, ${worldContainerY}px) scale(${gameScale})`,
                    transformOrigin: `${camera.x}px ${camera.y}px`,
                }}>
                     {/* The planet is an element inside the world */}
                    <div className="planet" style={{
                        width: PLANET_WIDTH,
                        height: PLANET_HEIGHT,
                        left: (WORLD_WIDTH - PLANET_WIDTH) / 2,
                        top: (WORLD_HEIGHT - PLANET_HEIGHT) / 2,
                    }}>
                        <div className="game-ui">
                            <HealthBar health={health} />
                            <h1>You Just Lost The Game</h1>
                        </div>
                    </div>
                    {orbs.map(orb => <Orb key={orb.id} orb={orb} camera={{x: 0, y: 0}} />)}
                </div>

                {/* Player is rendered separately, stays in viewport center */}
                <div ref={playerRef} className="player" style={{
                    transform: `translate(${playerScreenX - 15}px, ${playerScreenY - 15}px) scale(${gameScale})` // -15 to center the 30px player
                }}></div>
            </main>
            {isTouchDevice && <VirtualJoystick onMove={handleJoystickMove} />}
        </>
    );
}