const { useState, useEffect, useSyncExternalStore, useMemo, useCallback } = React;

function App() {
    const losses = useSyncExternalStore(lossesCollection.subscribe, lossesCollection.getList) || [];
    const [showDisclaimer, setShowDisclaimer] = useState(true);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        if (showDisclaimer) return;

        let animationFrameId;
        const root = document.documentElement;

        // --- State for smoothed animation ---
        let lastTime = performance.now();
        // Text gradient properties
        let currentGradientSize = 200;
        let currentGradientX = 0;
        let currentHue1 = 0, currentHue2 = 120, currentHue3 = 240;
        // Text fire effect properties
        let currentFireIntensity = 0;
        // Container background properties
        let currentBgPulse = 0;

        const visualize = () => {
            const now = performance.now();
            const deltaTime = now - lastTime;
            lastTime = now;

            const frequencyData = AudioManager.getFrequencyData();
            if (frequencyData) {
                // Slice frequency data for different ranges
                const bassFrequencies = frequencyData.slice(0, 5); // ~0-215Hz
                const midFrequencies = frequencyData.slice(15, 30); // ~645-1290Hz
                const highMidFrequencies = frequencyData.slice(30, 50); // ~1290-2150Hz
                const trebleFrequencies = frequencyData.slice(50, 100); // ~2150-4300Hz

                const averageBass = bassFrequencies.reduce((s, v) => s + v, 0) / bassFrequencies.length;
                const averageMid = midFrequencies.reduce((s, v) => s + v, 0) / midFrequencies.length;
                const averageHighMid = highMidFrequencies.reduce((s, v) => s + v, 0) / highMidFrequencies.length;
                const averageTreble = trebleFrequencies.reduce((s, v) => s + v, 0) / trebleFrequencies.length;

                // --- Smoothing factor ---
                const smoothing = 0.1;

                // --- Text Gradient Visualization ---
                const bassPulse = (averageBass / 255);
                const targetGradientSize = 200 + bassPulse * 200;
                currentGradientSize += (targetGradientSize - currentGradientSize) * smoothing;
                root.style.setProperty('--gradient-size', `${currentGradientSize}%`);

                const speed = 0.03;
                currentGradientX += speed * deltaTime;
                root.style.setProperty('--gradient-pos-x', `${currentGradientX}px`);

                const targetHue1 = (now / 50) % 360;
                const targetHue2 = (targetHue1 + 120 + (averageMid / 255) * 60) % 360;
                const targetHue3 = (targetHue2 + 120 + (averageTreble / 255) * 60) % 360;

                currentHue1 = targetHue1; // Base hue cycles steadily
                currentHue2 += (targetHue2 - currentHue2) * smoothing;
                currentHue3 += (targetHue3 - currentHue3) * smoothing;

                root.style.setProperty('--gradient-color-1', `hsl(${currentHue1}, 100%, 55%)`);
                root.style.setProperty('--gradient-color-2', `hsl(${currentHue2}, 100%, 55%)`);
                root.style.setProperty('--gradient-color-3', `hsl(${currentHue3}, 100%, 55%)`);

                // --- Text Fire Effect ---
                const targetFireIntensity = Math.min(averageHighMid / 180, 1.0); // Normalize high-mids for intensity
                currentFireIntensity += (targetFireIntensity - currentFireIntensity) * smoothing * 0.8;
                root.style.setProperty('--fire-intensity', currentFireIntensity);
                root.style.setProperty('--fire-time', `${now / 1000}s`);

                // --- Container Background Pulse ---
                const targetBgPulse = bassPulse;
                currentBgPulse += (targetBgPulse - currentBgPulse) * smoothing;
                const bgPulseSize = 100 + currentBgPulse * 40; // Pulse from 100% to 140%
                const bgPulseOpacity = currentBgPulse * 0.15; // Pulse opacity up to 0.15
                root.style.setProperty('--container-pulse-size', `${bgPulseSize}%`);
                root.style.setProperty('--container-pulse-opacity', bgPulseOpacity);
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
            root.style.removeProperty('--fire-intensity');
            root.style.removeProperty('--fire-time');
            root.style.removeProperty('--container-pulse-size');
            root.style.removeProperty('--container-pulse-opacity');
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