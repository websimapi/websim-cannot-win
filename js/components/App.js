const { useState, useEffect, useSyncExternalStore, useMemo, useCallback } = React;

function App() {
    const losses = useSyncExternalStore(lossesCollection.subscribe, lossesCollection.getList) || [];
    const [showDisclaimer, setShowDisclaimer] = useState(true);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        if (showDisclaimer) return;

        let animationFrameId;
        const root = document.documentElement;

        // State for continuous animation
        let gradientX = 0;
        let lastTime = performance.now();

        const visualize = () => {
            const now = performance.now();
            const deltaTime = now - lastTime;
            lastTime = now;

            const frequencyData = AudioManager.getFrequencyData();
            if (frequencyData) {
                // Slice frequency data for different ranges
                const bassFrequencies = frequencyData.slice(0, 5); // ~0-215Hz
                const midFrequencies = frequencyData.slice(15, 30); // ~645-1290Hz
                const trebleFrequencies = frequencyData.slice(50, 100); // ~2150-4300Hz

                const averageBass = bassFrequencies.reduce((s, v) => s + v, 0) / bassFrequencies.length;
                const averageMid = midFrequencies.reduce((s, v) => s + v, 0) / midFrequencies.length;
                const averageTreble = trebleFrequencies.reduce((s, v) => s + v, 0) / trebleFrequencies.length;

                // Pulse background size with bass
                const bassPulse = (averageBass / 255);
                const gradientSize = 200 + bassPulse * 200; // Pulse between 200% and 400%
                root.style.setProperty('--gradient-size', `${gradientSize}%`);

                // Move background position
                const speed = 0.03;
                gradientX += speed * deltaTime;
                root.style.setProperty('--gradient-pos-x', `${gradientX}px`);

                // Cycle through hues for 3 gradient colors
                const hue1 = (now / 40) % 360; // Base color cycles slowly
                const hue2 = (hue1 + 120 + (averageMid / 255) * 60) % 360; // Mids affect the second color
                const hue3 = (hue2 + 120 + (averageTreble / 255) * 60) % 360; // Trebles affect the third color

                root.style.setProperty('--gradient-color-1', `hsl(${hue1}, 100%, 55%)`);
                root.style.setProperty('--gradient-color-2', `hsl(${hue2}, 100%, 55%)`);
                root.style.setProperty('--gradient-color-3', `hsl(${hue3}, 100%, 55%)`);
            }
            animationFrameId = requestAnimationFrame(visualize);
        };

        visualize();

        return () => {
            cancelAnimationFrame(animationFrameId);
            // Reset CSS variables on cleanup
            root.style.removeProperty('--gradient-size');
            root.style.removeProperty('--gradient-pos-x');
            root.style.removeProperty('--gradient-color-1');
            root.style.removeProperty('--gradient-color-2');
            root.style.removeProperty('--gradient-color-3');
        };
    }, [showDisclaimer]);

    const handlePlayClick = async () => {
        await lossesCollection.create({});
        setShowDisclaimer(false);
        setIsFading(true);
        
        // Initialize and play audio on user interaction
        await AudioManager.init();
        AudioManager.play();

        setTimeout(() => {
            setIsFading(false);
        }, 10000); // Corresponds to fade animation duration
    };

    const mostRecentLoss = useMemo(() => {
        return losses.length > 0 ? losses[0] : null;
    }, [losses]);

    const allTimeCount = useMemo(() => losses.length, [losses]);
    
    const mostRecentLoser = useMemo(() => {
        return mostRecentLoss ? mostRecentLoss.username : '...';
    }, [mostRecentLoss]);

    const { todayCount, weekCount } = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).setHours(0,0,0,0);

        let today = 0;
        let week = 0;

        for (const loss of losses) {
            const lossTime = new Date(loss.created_at).getTime();
            if (lossTime >= startOfToday) {
                today++;
            }
            if (lossTime >= startOfWeek) {
                week++;
            }
        }
        return { todayCount: today, weekCount: week };
    }, [losses]);

    if (showDisclaimer) {
        return (
            <DisclaimerOverlay
                onPlayClick={handlePlayClick}
                mostRecentLoss={mostRecentLoss}
                weekCount={weekCount}
            />
        );
    }

    return (
        <>
            {isFading && <FadeInOverlay />}
            <div className="corner top-left">
                <div className="counter-box">
                    <span className="visualizer-text">Most Recent Loser</span>
                    <div id="most-recent-loser" className="counter-value visualizer-text">{mostRecentLoser}</div>
                </div>
            </div>
            <div className="corner top-right">
                <div className="counter-box">
                    <span className="visualizer-text">Lost Today</span>
                    <div id="today-counter" className="counter-value visualizer-text">{todayCount}</div>
                </div>
            </div>
            <div className="corner bottom-left">
                <div className="counter-box">
                    <span className="visualizer-text">All Time Losses</span>
                    <div id="all-time-counter" className="counter-value visualizer-text">{allTimeCount}</div>
                </div>
            </div>
            <div className="corner bottom-right">
                 <div className="counter-box">
                    <span className="visualizer-text">Lost This Week</span>
                    <div id="week-counter" className="counter-value visualizer-text">{weekCount}</div>
                </div>
            </div>
            <Game />
        </>
    );
}