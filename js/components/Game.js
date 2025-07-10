import React from 'react';
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
            // We set the player position relative to the viewport center, which is the transform origin.
            const playerX = window.innerWidth / 2 - 15;
            const playerY = window.innerHeight / 2 - 15;
            
            setPlayerState({
                x: playerX, 
                y: playerY, 
                vx: 0,
                vy: 0,
                grounded: false
            });
            setInitialized(true);
        }
    }, [initialized, gameAreaRef.current]);
    
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
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
                
                // We must use unscaled rect for spawning logic
                const mainEl = gameAreaRef.current;
                const rect = {
                    width: mainEl.offsetWidth,
                    height: mainEl.offsetHeight,
                    left: mainEl.offsetLeft,
                    top: mainEl.offsetTop
                };

                let x, y;
                let isInsideGameArea = true;

                // Keep generating coordinates until the orb is outside the game area
                while (isInsideGameArea) {
                    x = Math.random() * screenWidth;
                    y = Math.random() * screenHeight;
                    
                    isInsideGameArea = (
                        x >= rect.left &&
                        x <= rect.right &&
                        y >= rect.top &&
                        y <= rect.bottom
                    );
                }

                const newOrb = {
                    id: Date.now() + Math.random(),
                    x: x,
                    y: y,
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
            
            // Orb movement and collision with player
            const playerSize = 30; // aabb
            const orbSize = 15;

            const playerRect = {
                left: playerState.x,
                right: playerState.x + playerSize,
                top: playerState.y,
                bottom: playerState.y + playerSize
            };

            setOrbs(currentOrbs => {
                const updatedOrbs = currentOrbs.map(orb => ({
                    ...orb,
                    x: orb.x + orb.vx,
                    y: orb.y + orb.vy,
                })).filter(orb => {
                    const orbRect = {
                        left: orb.x,
                        right: orb.x + orbSize,
                        top: orb.y,
                        bottom: orb.y + orbSize
                    };

                    const collides = playerRect.right > orbRect.left &&
                                     playerRect.left < orbRect.right &&
                                     playerRect.bottom > orbRect.top &&
                                     playerRect.top < orbRect.bottom;
                    
                    if (collides) {
                        setHealth(h => Math.min(maxHealth, h + 0.1));
                        return false; // Remove orb on collision
                    }
                    return true;
                });
                return updatedOrbs;
            });

            // Use offsetWidth and offsetHeight for consistent dimensions.
            const gameAreaWidth = gameAreaRef.current.offsetWidth;
            const gameAreaHeight = gameAreaRef.current.offsetHeight;
            const gameAreaX = gameAreaRef.current.offsetLeft;
            const gameAreaY = gameAreaRef.current.offsetTop;
            
            const planetCenter = {
                x: gameAreaX + gameAreaWidth / 2, // relative to viewport
                y: gameAreaY + gameAreaHeight / 2 // relative to viewport
            };

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
                    Math.pow(playerCenterX - window.innerWidth / 2, 2) + 
                    Math.pow(playerCenterY - window.innerHeight / 2, 2)
                );
                
                // Scale calculation: closer = larger scale (zoomed in), farther = smaller scale (zoomed out)
                const maxDistance = Math.max(window.innerWidth, window.innerHeight) / 2;
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
                const currentPlayerRect = {
                    left: x,
                    right: x + playerSize,
                    top: y,
                    bottom: y + playerSize
                };

                const planetRect = {
                    left: gameAreaX,
                    right: gameAreaX + gameAreaWidth,
                    top: gameAreaY,
                    bottom: gameAreaY + gameAreaHeight
                };

                const isColliding = currentPlayerRect.right > planetRect.left &&
                                  currentPlayerRect.left < planetRect.right &&
                                  currentPlayerRect.bottom > planetRect.top &&
                                  currentPlayerRect.top < planetRect.bottom;

                if (isColliding) {
                    grounded = true;
                   
                    const penLeft = currentPlayerRect.right - planetRect.left;
                    const penRight = planetRect.right - currentPlayerRect.left;
                    const penTop = currentPlayerRect.bottom - planetRect.top;
                    const penBottom = planetRect.bottom - currentPlayerRect.top;

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
        <div className="game-container" style={{
            transform: `scale(${gameScale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.1s ease-out'
        }}>
            <main ref={gameAreaRef} >
                <div className="health-bar-container">
                    <div className="health-bar" style={{ width: `${(health / maxHealth) * 100}%` }}></div>
                </div>
                <h1>You Just Lost The Game</h1>
            </main>
            <div ref={playerRef} className="player" style={{
                position: 'absolute',
                transform: `translate(${playerState.x}px, ${playerState.y}px)`
            }}></div>
            {orbs.map(orb => (
                <div key={orb.id} className="orb" style={{
                    position: 'absolute',
                    transform: `translate(${orb.x}px, ${orb.y}px)`
                }}></div>
            ))}
        </div>
    );
}

export default Game;