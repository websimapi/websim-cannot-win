const { useState, useEffect, useSyncExternalStore, useMemo } = React;

function App() {
    const losses = useSyncExternalStore(lossesCollection.subscribe, lossesCollection.getList) || [];
    const [showDisclaimer, setShowDisclaimer] = useState(true);
    const [isFading, setIsFading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        window.websim.getCurrentUser().then(setCurrentUser);
    }, []);

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

    const maxHealth = useMemo(() => {
        if (!currentUser || !losses) return 10; // Default health if data is not yet available

        const userLosses = losses.filter(loss => loss.user_id === currentUser.id).length;
        
        // ((how many times this user has lost the game) / 10) + 10 + ( how many times users this week have lost the game / 100 )
        const calculatedHealth = (userLosses / 10) + 10 + (weekCount / 100);
        
        return Math.max(10, calculatedHealth); // Ensure there's a minimum amount of health
    }, [currentUser, losses, weekCount]);

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
                    <span>Most Recent Loser</span>
                    <div id="most-recent-loser" className="counter-value">{mostRecentLoser}</div>
                </div>
            </div>
            <div className="corner top-right">
                <div className="counter-box">
                    <span>Lost Today</span>
                    <div id="today-counter" className="counter-value">{todayCount}</div>
                </div>
            </div>
            <div className="corner bottom-left">
                <div className="counter-box">
                    <span>All Time Losses</span>
                    <div id="all-time-counter" className="counter-value">{allTimeCount}</div>
                </div>
            </div>
            <div className="corner bottom-right">
                 <div className="counter-box">
                    <span>Lost This Week</span>
                    <div id="week-counter" className="counter-value">{weekCount}</div>
                </div>
            </div>
            <Game maxHealth={maxHealth} />
        </>
    );
}