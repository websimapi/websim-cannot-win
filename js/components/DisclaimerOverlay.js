const { useState, useEffect } = React;

const CharacterSelector = ({ onSelect, selectedShape }) => {
    const characters = [
        { name: 'Square', shape: 'square', unlocked: true },
        { name: 'Circle', shape: 'circle', unlocked: true },
        { name: 'Triangle', shape: 'triangle', unlocked: false },
        { name: 'Rectangle', shape: 'rectangle', unlocked: false },
    ];

    return (
        <div className="character-selector">
            <h3>Hey, looks like you have been here before! Try out some of these</h3>
            <div className="character-options">
                {characters.map(char => (
                    <button
                        key={char.shape}
                        className={`character-option ${selectedShape === char.shape ? 'selected' : ''}`}
                        onClick={() => onSelect(char.shape)}
                        disabled={!char.unlocked}
                    >
                        <div className={`char-preview ${char.shape}`}></div>
                        <span>{char.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

function DisclaimerOverlay({ onPlayClick, mostRecentLoss, weekCount, hasPlayedBefore, onCharacterSelect, selectedCharacter, currentUser }) {
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
                <p>{weekCount > 0 ? `${weekCount} users could not even win this week!` : "No one has lost yet this week. Will you be the first?"}</p>
                <p>What makes you think that you can win?!</p>

                {hasPlayedBefore && (
                    <CharacterSelector
                        onSelect={onCharacterSelect}
                        selectedShape={selectedCharacter}
                    />
                )}
                
                <button className="play-button" onClick={onPlayClick}>Play</button>
            </div>
        </div>
    );
}