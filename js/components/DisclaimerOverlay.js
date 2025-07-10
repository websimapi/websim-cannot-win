const { useState, useEffect } = React;

function DisclaimerOverlay({ onPlayClick, mostRecentLoss, weekCount }) {
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        window.websim.getCurrentUser().then(setCurrentUser);
    }, []);

    const username = mostRecentLoss ? mostRecentLoss.username : (currentUser ? currentUser.username : 'Someone');
    const date = mostRecentLoss ? new Date(mostRecentLoss.created_at).toLocaleDateString() : new Date().toLocaleDateString();

    return (
        <div className="disclaimer-overlay">
            <a href="https://sonauto.ai/" target="_blank" rel="noopener noreferrer" className="sonauto-link" title="Music Generated with Sonauto.ai">
                <img src="/sonauto.png" alt="Sonauto.ai Logo" />
            </a>
            <div className="disclaimer-content">
                <p>You are not able to win. It is actually not possible to win, even if you tried to win you would be unable to.</p>
                <p>{username} tried to win on {date} and without a doubt 100% certinaly did not win.</p>
                <p>{weekCount} users could not even win this week!</p>
                <p>What makes you think that you can win?!</p>
                <button className="play-button" onClick={onPlayClick}>Play</button>
            </div>
        </div>
    );
}