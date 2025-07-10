const { useState, useRef, useCallback } = React;

function VirtualJoystick({ onMove }) {
    const baseRef = useRef(null);
    const stickRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleTouchStart = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
        moveStick(e.touches[0]);
    }, [onMove]);

    const handleTouchMove = useCallback((e) => {
        e.preventDefault();
        if (isDragging) {
            moveStick(e.touches[0]);
        }
    }, [isDragging, onMove]);
    
    const handleTouchEnd = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        if (stickRef.current) {
            stickRef.current.style.transform = 'translate(0px, 0px)';
        }
        onMove({ x: 0, y: 0 });
    }, [onMove]);

    const moveStick = (touch) => {
        if (!baseRef.current || !stickRef.current) return;

        const baseRect = baseRef.current.getBoundingClientRect();
        const baseCenterX = baseRect.left + baseRect.width / 2;
        const baseCenterY = baseRect.top + baseRect.height / 2;

        let dx = touch.clientX - baseCenterX;
        let dy = touch.clientY - baseCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const maxDist = baseRect.width / 2;

        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }
        
        stickRef.current.style.transform = `translate(${dx}px, ${dy}px)`;

        const moveVector = {
            x: dx / maxDist,
            y: dy / maxDist
        };
        onMove(moveVector);
    };

    return (
        <div 
            className="joystick-container"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            <div ref={baseRef} className="joystick-base">
                <div ref={stickRef} className="joystick-stick"></div>
            </div>
        </div>
    );
}