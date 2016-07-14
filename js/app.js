/* jshint -W097 */
/* jshint -W117 */
"use strict";

// A cross-browser requestAnimationFrame and cancelAnimationFrame
window.requestAnimFrame = (function () {
    return  window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 17);
            };
})();
window.cancelAnimFrame = (function () {
    return window.cancelAnimationFrame ||
            window.webkitCancelAnimationFrame ||
            window.mozCancelAnimationFrame ||
            function (callback) {
                window.clearTimeout(callback);
            };
})();

function Interval(fn, time) {
    var timer = false;
    this.start = function () {
        if (!this.isRunning()) {
            timer = setInterval(fn, time);
        }
    };
    this.stop = function () {
        clearInterval(timer);
        timer = false;
    };
    this.isRunning = function () {
        return timer !== false;
    };
}

function Point(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}

define(function (require) {

    //(similar to jQuery, and a lot smaller)
    var $ = require('zepto'),
        attachFastClick = require('fastclick'),
        killed = $('.killed'),
        timer = $('#timer'),
        timerCounter,
        canvas = document.getElementById("screenGame"),
        ctx = canvas.getContext("2d"),
        touches = [],
        then = Date.now(),
        running = false,
        bugsArray = [],
        transform = null,
        gameTimer = 30;

    //First hide divs that shouldn't be seen
    $('#gameEnd').hide();
    $('#counters').hide();

    //Bugs library
    require('bug');

    //Remove delay click
    attachFastClick(document.body);

    function setCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    setCanvas();

    function enableInputs() {
        canvas.addEventListener('touchstart', function (evt) {
            var t = evt.changedTouches, i, x, y;
            for (i = 0; i < t.length; i++) {
                x = t[i].pageX - canvas.offsetLeft;
                y = t[i].pageY - canvas.offsetTop;
                touches[t[i].identifier % 100] = new Point(x, y);
            }
        }, false);
        canvas.addEventListener('touchmove', function (evt) {
            evt.preventDefault();
            var t = evt.changedTouches, i;
            for (i = 0; i < t.length; i++) {
                touches[t[i].identifier % 100].x = t[i].pageX - canvas.offsetLeft;
                touches[t[i].identifier % 100].y = t[i].pageY - canvas.offsetTop;
            }
        }, false);
        canvas.addEventListener('touchend', function (evt) {
            var t = evt.changedTouches, i;
            for (i = 0; i < t.length; i++) {
                touches[t[i].identifier % 100] = null;
            }
        }, false);
        canvas.addEventListener('touchcancel', function (evt) {
            var t = evt.changedTouches, i;
            for (i = 0; i < t.length; i++) {
                touches[t[i].identifier % 100] = null;
            }
        }, false);

        canvas.addEventListener('mousedown', function (evt) {
            evt.preventDefault();
            var x = evt.pageX - canvas.offsetLeft;
            var y = evt.pageY - canvas.offsetTop;
            touches[0] = new Point(x, y);
        }, false);
        document.addEventListener('mousemove', function (evt) {
            if (touches[0]) {
                touches[0].x = evt.pageX - canvas.offsetLeft;
                touches[0].y = evt.pageY - canvas.offsetTop;
            }
        }, false);
        document.addEventListener('mouseup', function (evt) {
            touches[0] = null;
        }, false);
    }

    enableInputs();

    var options = {
        imageSprite: "img/fly-sprite.png",
        fly_width: 26,
        fly_height: 28,
        num_frames: 5,
        minSpeed: 0.5,
        maxSpeed: 2,
        wingsOpen: (Math.random() > 0.5) ? true : false
    };

    var transforms = {
        'Moz': function (s) {
            this.bug.style.MozTransform = s;
        },
        'webkit': function (s) {
            this.bug.style.webkitTransform = s;
        },
        'O': function (s) {
            this.bug.style.OTransform = s;
        },
        'ms': function (s) {
            this.bug.style.msTransform = s;
        },
        'Khtml': function (s) {
            this.bug.style.KhtmlTransform = s;
        },
        'w3c': function (s) {
            this.bug.style.transform = s;
        }
    };

    // check to see if it is a modern browser:
    if ('transform' in document.documentElement.style) {
        transform = transforms.w3c;
    } else {
        // feature detection for the other transforms:
        var vendors = ['Moz', 'webkit', 'O', 'ms', 'Khtml'];

        for (var i = 0; i < vendors.length; i++) {
            if (vendors[i] + 'Transform' in document.documentElement.style) {
                transform = transforms[vendors[i]];
                break;
            }
        }
    }


    function addFly() {
        var bug = new SpawnBug();

        bug.initialize(transform, options);
        bug.drawBug();

        bug.bug.onclick = function (e) {
            killBug(bug);
        };
        bug.bug.addEventListener("touchstart", function (evt) {
            killBug(bug);
        }, false);

        bug.bug.addEventListener('mousedown', function (evt) {
            killBug(bug);
        }, false);

        return bug;
    }

    function killBug(bug){
        if (running && bug.alive) {
            var bugsKilled = +killed.html();
            killed.html(++bugsKilled >= 10 ? bugsKilled : ("0" + bugsKilled));

            bug.die();

            setTimeout(function () {
                bug.bug.remove();
            }, 2500);

            var bugsToAddWhenDead = Math.floor((Math.random() * 2) + 1);
            for (var i = 0; i < bugsToAddWhenDead; i++) {
                bugsArray.push(addFly());
            }

            bugsArray.pop(bug);
        } else {
            bug.bug.remove();
        }
    }

    function count() {
        if (running && gameTimer > 1) {
            gameTimer--;
            timer.html(gameTimer >= 10 ? gameTimer : ("0" + gameTimer));
        } else if (running && gameTimer <= 1) {
            running = false;
            cancelAnimFrame(main);
            timerCounter.stop();
            timerCounter = null;

            //Make div menu disappear
            $('#gameEnd').show();
            $('#counters').hide();

            $('.bug').remove();
        }
    }

    //Reset game to original state
    function reset() {
        //Restart counters
        timer.html(gameTimer);
        killed.html("00");

        bugsArray.length = 0;
        for (var i = 0; i < 25; i++) {
            bugsArray.push(addFly());
        }
    }

    // Pause and unpause
    function pause() {
        running = false;
    }

    function unpause() {
        running = true;
        then = Date.now();
        main();
    }

    // Update game objects
    function update(dt) {
        for (var i = 0; running && i < bugsArray.length; i++) {
            var randomSpeed = Math.floor((Math.random() * 0.5) + 0.25);
            bugsArray[i].options.minSpeed = options.minSpeed + randomSpeed;
            bugsArray[i].options.maxSpeed = options.maxSpeed + randomSpeed;
            bugsArray[i].options.wingsOpen = (Math.random() > 0.5) ? true : false;
        }
    }

    // Draw everything
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    function render() {
        for (var i = 0; i < bugsArray.length; i++) {
            bugsArray[i].animate();
        }
    }

    // The main game loop
    function main() {
        if (!running) {
            return;
        }

        var now = Date.now();
        var dt = (now - then) / 1000.0;

        update(dt);
        render();

        if (!timerCounter || !timerCounter.isRunning()) {
            timerCounter = new Interval(count, 1000);
            timerCounter.start();
        }

        then = now;
        requestAnimFrame(main);
    }

    // Don't run the game when the tab isn't visible
    window.addEventListener('focus', function () {
        unpause();
    });
    window.addEventListener('blur', function () {
        pause();
    });
    window.onresize = function () {
        setCanvas();
    };

    function beginTheGame() {
        running = false; //PSLM
        gameTimer = 30;

        //First we clean
        $('.bug').remove();

        //Make div menu dissapear
        $('#gameStart').hide();
        $('#gameEnd').hide();
        $('#counters').show();

        // Let's play this game!
        reset();
        then = Date.now();
        running = true;
        main();
    }

    //Button to start the game
    $('#startGame').on('click', beginTheGame);

    //Button to start the game AGAIN
    $('#endGame').on('click', beginTheGame);
});

screen.lockOrientationUniversal = screen.lockOrientation || screen.mozLockOrientation || screen.msLockOrientation;
screen.lockOrientationUniversal("landscape-primary");