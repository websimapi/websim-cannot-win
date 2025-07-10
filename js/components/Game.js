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

const BlueOrb = ({ orb }) => {
    return (
        <div
            className="blue-orb"
            style={{
                backgroundImage: 'url(/blue_orb.png)',
                backgroundSize: 'contain',
                transform: `translate(${orb.x}px, ${orb.y}px)`,
            }}
        ></div>
    );
};

const Npc = ({ npc }) => {
    const healthPercentage = (npc.health / 1.0) * 100;
    return (
        <div className="npc" style={{ transform: `translate(${npc.x}px, ${npc.y}px)` }}>
            <div className="npc-health-bar-container">
                <div className="npc-health-bar" style={{ width: `${healthPercentage}%` }}></div>
            </div>
        </div>
    );
};

function Game({ cornerRefs }) {
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
    const [blueOrbs, setBlueOrbs] = useState([]);
    const [npcs, setNpcs] = useState([]);

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

    // Game Phase Timers
    useEffect(() => {
        if (!initialized) return;

        // --- Phase 1: 95 seconds ---
        const phase1Duration = 95000;
        let phase1Active = true;

        // NPC Spawner
        const npcSpawnInterval = setInterval(() => {
            if (!phase1Active || !gameAreaRef.current) return;
            
            const gameRect = gameAreaRef.current.getBoundingClientRect();
            if (!gameRect.width) return;

            const cornerRefArray = Object.values(cornerRefs);
            const randomCornerRef = cornerRefArray[Math.floor(Math.random() * cornerRefArray.length)].current;
            if (!randomCornerRef) return;
            
            const cornerRect = randomCornerRef.getBoundingClientRect();

            // Translate corner's viewport coordinates to game world coordinates
            const spawnX = (cornerRect.left - gameRect.left + cornerRect.width / 2) / gameScale;
            const spawnY = (cornerRect.top - gameRect.top + cornerRect.height / 2) / gameScale;
           
            const newNpc = {
                id: Date.now() + Math.random(),
                x: spawnX,
                y: spawnY,
                vx: 0,
                vy: 0,
                health: 1.0,
                createdAt: Date.now(),
            };
            setNpcs(prev => [...prev, newNpc]);
        }, 5000);

        const phase1Timeout = setTimeout(() => {
            phase1Active = false;
        }, phase1Duration);


        return () => {
            clearInterval(npcSpawnInterval);
            clearTimeout(phase1Timeout);
        };
    }, [initialized, gameScale, cornerRefs]);

    // Health decay and orb spawning timers
    useEffect(() => {
        if (!initialized) return;

        const healthInterval = setInterval(() => {
            setHealth(h => Math.max(0, h - 0.1));
        }, 3000);

        const orbInterval = setInterval(() => {
            if (!gameAreaRef.current) return;
            const gameAreaWidth = gameAreaRef.current.offsetWidth;
            const gameAreaHeight = gameAreaRef.current.offsetHeight;

            // Spawn orbs within a larger area than the initial view
            const spawnRadiusX = gameAreaWidth * 2;
            const spawnRadiusY = gameAreaHeight * 2;
            
            // Center the spawn area around the game area center
            const spawnCenterX = gameAreaWidth / 2;
            const spawnCenterY = gameAreaHeight / 2;

            let newOrbX, newOrbY;
            
            // This loop ensures orbs don't spawn inside the central game area.
            do {
                newOrbX = Math.random() * spawnRadiusX - (spawnRadiusX / 2) + spawnCenterX;
                newOrbY = Math.random() * spawnRadiusY - (spawnRadiusY / 2) + spawnCenterY;
            } while (
                newOrbX >= 0 && newOrbX <= gameAreaWidth &&
                newOrbY >= 0 && newOrbY <= gameAreaHeight
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
            if (!gameAreaRef.current) return;

            // Use offsetWidth and offsetHeight for consistent dimensions.
            const gameAreaWidth = gameAreaRef.current.offsetWidth;
            const gameAreaHeight = gameAreaRef.current.offsetHeight;
            
            const planetCenter = {
                x: gameAreaWidth / 2, // relative to gameArea
                y: gameAreaHeight / 2 // relative to gameArea
            };
            const playerSize = 30;

            const now = Date.now();

            // --- NPC LOGIC ---
            setNpcs(currentNpcs => {
                const updatedNpcs = [];
                const newlyDeadNpcs = [];

                for (const npc of currentNpcs) {
                    let { x, y, vx, vy, health } = npc;
                    
                    // Health decay
                    if (now - npc.createdAt > 3000) {
                        health -= 0.1;
                    }
                    
                    if (health <= 0) {
                        newlyDeadNpcs.push(npc);
                        continue;
                    }

                    // Simple AI: Move towards player
                    const force = 0.1;
                    const pCenterX = playerState.x + playerSize / 2;
                    const pCenterY = playerState.y + playerSize / 2;
                    const dxToPlayer = pCenterX - x;
                    const dyToPlayer = pCenterY - y;
                    const distToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);
                    if (distToPlayer > 0) {
                        vx += (dxToPlayer / distToPlayer) * force;
                        vy += (dyToPlayer / distToPlayer) * force;
                    }
                    
                    // Gravity
                    const gravity = 0.3;
                    const dx = planetCenter.x - (x + 12.5);
                    const dy = planetCenter.y - (y + 12.5);
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0) {
                        vx += (dx / dist) * gravity;
                        vy += (dy / dist) * gravity;
                    }

                    x += vx;
                    y += vy;
                    
                    // Drag
                    vx *= 0.98;
                    vy *= 0.98;

                    updatedNpcs.push({ ...npc, x, y, vx, vy, health });
                }
                
                // Spawn blue orbs for dead NPCs
                if (newlyDeadNpcs.length > 0) {
                    setBlueOrbs(prev => [
                        ...prev,
                        ...newlyDeadNpcs.map(npc => ({
                            id: npc.id,
                            x: npc.x,
                            y: npc.y
                        }))
                    ]);
                }

                return updatedNpcs;
            });
            
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
                
                // NPC Collision with Player
                const npcSize = 25;
                setNpcs(currentNpcs => {
                    const remainingNpcs = [];
                    let damageTaken = 0;
                    for(const npc of currentNpcs) {
                        const npcCenterX = npc.x + npcSize / 2;
                        const npcCenterY = npc.y + npcSize / 2;
                        const distBetween = Math.sqrt(
                            Math.pow(playerCenterX - npcCenterX, 2) +
                            Math.pow(playerCenterY - npcCenterY, 2)
                        );

                        if(distBetween < (playerSize / 2) + (npcSize / 2)) {
                            damageTaken += 1;
                            AudioManager.playSound('npc-explosion');
                        } else {
                            remainingNpcs.push(npc);
                        }
                    }
                    if(damageTaken > 0) {
                        setHealth(h => Math.max(0, h - damageTaken));
                    }
                    return remainingNpcs;
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

        gameLoop();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [initialized, playerState.x, playerState.y]);

    return (
        <main ref={gameAreaRef} style={{
            transform: `scale(${gameScale})`,
            transformOrigin: 'center',
            transition: 'transform 0.1s ease-out'
        }}>
            {orbs.map(orb => <Orb key={orb.id} orb={orb} />)}
            {blueOrbs.map(orb => <BlueOrb key={orb.id} orb={orb} />)}
            {npcs.map(npc => <Npc key={npc.id} npc={npc} />)}
            <div ref={playerRef} className="player" style={{
                transform: `translate(${playerState.x}px, ${playerState.y}px)`
            }}></div>
            <div className="game-ui">
                <HealthBar health={health} />
                <h1>You Just Lost The Game</h1>
            </div>
        </main>
    );
}