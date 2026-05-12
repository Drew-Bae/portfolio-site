import { useState } from 'react';
import MusicPlayer from './MusicPlayer';
import './Menu.css';

function Menu() {
    const [isOpen, setIsOpen] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);

    return (
        <div className="menu-container">
            <div 
                className="music-hover-area"
                onMouseEnter={() => setShowPlayer(true)}
                onMouseLeave={() => setShowPlayer(false)}
                >

                <div className={`button-stack ${isOpen ? 'button-stack-open' : ''}`}>
                    <button
                        className="circle"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        DB
                    </button>

                    <div
                        className={`music-player-wrapper ${
                        showPlayer ? "show-player" : ""
                        }`}
                    >
                        <MusicPlayer />
                    </div>

                    <nav className={`menu-content ${isOpen ? 'menu-open' : ''}`}>
                        <a href="#heading1">heading1</a>
                        <a href="#heading2">heading2</a>
                        <a href="#heading3">heading3</a>
                    </nav>
                </div>
            </div>
        </div>
    );
}

export default Menu;
