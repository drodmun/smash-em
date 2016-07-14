/* jshint -W097 */
/* jshint -W117 */
/* jshint -W003 */
"use strict";

/**
 * Helper methods:
 **/
var cloneOf = function (obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    var temp = obj.constructor(), key; // changed

    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            temp[key] = cloneOf(obj[key]);
        }
    }

    return temp;
};

var mergeOptions = function (obj1, obj2, clone) {
    var newObj = (typeof clone === 'undefined' || clone === true) ? cloneOf(obj1) : obj1,
        key;
    for (key in obj2) {
        if (obj2.hasOwnProperty(key)) {
            newObj[key] = obj2[key];
        }
    }
    return newObj;
};

var Bug = {
    options: {
        wingsOpen: false,
        walkSpeed: 2,
        flySpeed: 40,
        edge_resistance: 50
    },
    initialize: function (transform, options) {

        this.options = mergeOptions(this.options, options);

        this.NEAR_TOP_EDGE = 1;
        this.NEAR_BOTTOM_EDGE = 2;
        this.NEAR_LEFT_EDGE = 4;
        this.NEAR_RIGHT_EDGE = 8;

        this.directions = {}; // 0 degrees starts on the East
        this.directions[this.NEAR_TOP_EDGE] = 270;
        this.directions[this.NEAR_BOTTOM_EDGE] = 90;
        this.directions[this.NEAR_LEFT_EDGE] = 0;
        this.directions[this.NEAR_RIGHT_EDGE] = 180;
        this.directions[this.NEAR_TOP_EDGE + this.NEAR_LEFT_EDGE] = 315;
        this.directions[this.NEAR_TOP_EDGE + this.NEAR_RIGHT_EDGE] = 225;
        this.directions[this.NEAR_BOTTOM_EDGE + this.NEAR_LEFT_EDGE] = 45;
        this.directions[this.NEAR_BOTTOM_EDGE + this.NEAR_RIGHT_EDGE] = 135;

        this.angle_deg = 0;
        this.angle_rad = 0;
        this.large_turn_angle_deg = 0;
        this.near_edge = false;
        this.edge_test_counter = 10;
        this.small_turn_counter = 0;
        this.large_turn_counter = 0;
        this.toggle_stationary_counter = Math.random() * 50;

        this.stationary = false;
        this.bug = null;
        this.wingsOpen = this.options.wingsOpen;
        this.transform = transform;
        this.walkIndex = 0;
        this.alive = true;

        this.rad2deg_k = 180 / Math.PI;
        this.deg2rad_k = Math.PI / 180;

        this.makeBug();

        this.angle_rad = this.deg2rad(this.angle_deg);

        this.angle_deg = this.random(0, 360, true);
    },
    go: function () {
        if (this.transform) {
            this.drawBug();
            var that = this,
                period = Math.floor((Math.random() * 5) + 1) * 10;

            this.going = setInterval(function () {
                that.animate();
            }, period);
        }
    },
    stop: function () {
        if (this.going) {
            clearInterval(this.going);
            this.going = null;
        }
        if (this.flyperiodical) {
            clearInterval(this.flyperiodical);
            this.flyperiodical = null;
        }
    },
    animate: function () {
        if (this.alive) {
            if (--this.toggle_stationary_counter <= 0) {
                this.toggleStationary();
            }

            if (this.stationary) {
                return;
            }

            if (--this.edge_test_counter <= 0 && this.bug_near_window_edge()) {
                // if near edge, go away from edge
                this.angle_deg %= 360;
                if (this.angle_deg < 0) {
                    this.angle_deg += 360;
                }

                if (Math.abs(this.directions[this.near_edge] - this.angle_deg) > 15) {
                    var angle1 = this.directions[this.near_edge] - this.angle_deg,
                        angle2 = (360 - this.angle_deg) + this.directions[this.near_edge];
                    this.large_turn_angle_deg = (Math.abs(angle1) < Math.abs(angle2) ? angle1 : angle2);

                    this.edge_test_counter = 10;
                    this.large_turn_counter = 100;
                    this.small_turn_counter = 30;
                }
            }
            if (--this.large_turn_counter <= 0) {
                this.large_turn_angle_deg = this.random(1, 150, true);
                this.next_large_turn();
            }
            if (--this.small_turn_counter <= 0) {
                this.angle_deg += this.random(1, 10);
                this.next_small_turn();
            } else {
                var dangle = this.random(1, 5, true);
                if ((this.large_turn_angle_deg > 0 && dangle < 0) || (this.large_turn_angle_deg < 0 && dangle > 0)) {
                    dangle = -dangle; // ensures both values either + or -
                }
                this.large_turn_angle_deg -= dangle;
                this.angle_deg += dangle;
            }

            this.angle_rad = this.deg2rad(this.angle_deg);

            var dx = Math.cos(this.angle_rad) * this.options.walkSpeed,
                dy = -Math.sin(this.angle_rad) * this.options.walkSpeed;

            this.moveBug(dx, dy);
            this.walkFrame();
            this.transform("rotate(" + (90 - this.angle_deg) + "deg)");
        }
    },
    makeBug: function () {
        if (!this.bug) {
            var row = (this.wingsOpen) ? '0' : '-' + this.options.fly_height + 'px',
                newBug = document.createElement('div');

            newBug.setAttribute('class', 'bug');
            newBug.style.background = 'transparent url(' + this.options.imageSprite + ') no-repeat 0 ' + row;
            newBug.style.width = this.options.fly_width + 'px';
            newBug.style.height = this.options.fly_height + 'px';
            newBug.style.position = 'fixed';
            newBug.style.zIndex = '9999999';

            this.bug = newBug;
            this.setPos();
        }
    },
    setPos: function (top, left) {
        this.bug.top = top || this.random(this.options.edge_resistance, document.documentElement.clientHeight - this.options.edge_resistance);
        //bug.top = bug.top < 0 ? -bug.top : bug.top;
        this.bug.left = left || this.random(this.options.edge_resistance, document.documentElement.clientWidth - this.options.edge_resistance);
        //bug.left = bug.left < 0 ? -bug.left : bug.left;
        this.bug.style.top = this.bug.top + 'px';
        this.bug.style.left = this.bug.left + 'px';
    },
    drawBug: function (top, left) {

        if (!this.bug) {
            this.makeBug();
        }
        if (top && left) {
            this.setPos(top, left);
        } else {
            this.setPos(this.bug.top, this.bug.left);
        }
        if (!this.inserted) {
            this.inserted = true;
            document.body.appendChild(this.bug);
        }
    },
    toggleStationary: function () {
        this.stationary = !this.stationary;
        this.next_stationary();
        var yPos = (this.options.wingsOpen) ? '0' : '-' + this.options.fly_height + 'px';
        if (this.stationary) {
            this.bug.style.backgroundPosition = '0 ' + yPos;
        } else {
            this.bug.style.backgroundPosition = '-' + this.options.fly_width + 'px ' + yPos;
        }
    },
    walkFrame: function () {
        var xpos = (-1 * (this.walkIndex * this.options.fly_width)) + 'px',
            ypos = (this.options.wingsOpen) ? '0' : '-' + this.options.fly_height + 'px';
        this.bug.style.backgroundPosition = xpos + ' ' + ypos;
        this.walkIndex++;
        if (this.walkIndex >= this.options.num_frames) {
            this.walkIndex = 0;
        }
    },
    moveBug: function (dx, dy) {
        this.bug.style.top = (this.bug.top += dy) + 'px';
        this.bug.style.left = (this.bug.left += dx) + 'px';
    },
    fly: function (landingPosition) {
        var currentTop = parseInt(this.bug.style.top, 10),
            currentLeft = parseInt(this.bug.style.left, 10),
            diffx = (currentLeft - landingPosition.left),
            diffy = (currentTop - landingPosition.top),
            angle = Math.atan(diffy / diffx);

        if (Math.abs(diffx) + Math.abs(diffy) < 50) {
            this.bug.style.backgroundPosition = (-2 * this.options.fly_width) + 'px -' + (2 * this.options.fly_height) + 'px';
        }
        if (Math.abs(diffx) + Math.abs(diffy) < 30) {
            this.bug.style.backgroundPosition = (-1 * this.options.fly_width) + 'px -' + (2 * this.options.fly_height) + 'px';
        }
        if (Math.abs(diffx) + Math.abs(diffy) < 10) {
            this.bug.style.backgroundPosition = '0 0';

            this.stop();
            this.go();

            return;
        }

        var dx = Math.cos(angle) * this.options.flySpeed,
            dy = Math.sin(angle) * this.options.flySpeed;

        if ((currentLeft > landingPosition.left && dx > 0) || (currentLeft > landingPosition.left && dx < 0)) {
            // make sure angle is right way
            dx = -1 * dx;
            if (Math.abs(diffx) < Math.abs(dx)) {
                dx = dx / 4;
            }
        }
        if ((currentTop < landingPosition.top && dy < 0) || (currentTop > landingPosition.top && dy > 0)) {
            dy = -1 * dy;
            if (Math.abs(diffy) < Math.abs(dy)) {
                dy = dy / 4;
            }
        }

        this.bug.style.top = (currentTop + dy) + 'px';
        this.bug.style.left = (currentLeft + dx) + 'px';
    },
    flyRand: function () {
        this.stop();
        var landingPosition = {};
        landingPosition.top = this.random(this.options.edge_resistance, document.documentElement.clientHeight - this.options.edge_resistance);
        landingPosition.left = this.random(this.options.edge_resistance, document.documentElement.clientWidth - this.options.edge_resistance);

        this.startFlying(landingPosition);
    },
    startFlying: function (landingPosition) {
        this.bug.left = landingPosition.left;
        this.bug.top = landingPosition.top;

        var currentTop = parseInt(this.bug.style.top, 10),
            currentLeft = parseInt(this.bug.style.left, 10),
            diffx = (landingPosition.left - currentLeft),
            diffy = (landingPosition.top - currentTop);

        this.angle_rad = Math.atan(diffy / diffx);
        this.angle_deg = this.rad2deg(this.angle_rad);

        if (diffx > 0) {// going left: quadrant 1 or 2
            this.angle_deg = 90 + this.angle_deg;
        } else {// going right: quadrant 3 or 4
            this.angle_deg = 270 + this.angle_deg;
        }

        this.angle_rad = this.deg2rad(this.angle_deg);
        this.transform("rotate(" + (90 - this.angle_deg) + "deg)");

        // start animation:
        var that = this;
        this.flyperiodical = setInterval(function () {
            that.fly(landingPosition);
        }, 10);
    },
    flyOff: function () {
        this.stop();
        // pick a random side to fly off to, where 0 is top and continuing clockwise.
        var side = this.random(0, 3),
            style = {},
            d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0],
            windowX = window.innerWidth || e.clientWidth || g.clientWidth,
            windowY = window.innerHeight || e.clientHeight || g.clientHeight;

        if (side === 0) {
            // top:
            style.top = -200;
            style.left = Math.random() * windowX;
        } else if (side === 1) {
            // right:
            style.top = Math.random() * windowY;
            style.left = windowX + 200;
        } else if (side === 2) {
            //bottom:
            style.top = windowY + 200;
            style.left = Math.random() * windowX;
        } else {
            // left:
            style.top = Math.random() * windowY;
            style.left = -200;
        }
        this.startFlying(style);
    },
    die: function () {
        this.stop();
        //pick death style:
        var deathType = this.random(0, 2),
            posX = ((deathType * 2) * this.options.fly_width),
            posY = (3 * this.options.fly_height);
        this.bug.style.backgroundPosition = '-' + posX + 'px -' + posY + 'px';
        this.alive = false;
    },
    /* helper methods: */
    rad2deg: function (rad) {
        return rad * this.rad2deg_k;
    },
    deg2rad: function (deg) {
        return deg * this.deg2rad_k;
    },
    random: function (min, max, plusminus) {
        var result = Math.round(min - 0.5 + (Math.random() * (max - min + 1)));
        if (plusminus) {
            return Math.random() > 0.5 ? result : -result;
        }
        return result;
    },
    next_small_turn: function () {
        this.small_turn_counter = Math.round(Math.random() * 10);
    },
    next_large_turn: function () {
        this.large_turn_counter = Math.round(Math.random() * 40);
    },
    next_stationary: function () {
        this.toggle_stationary_counter = this.random(50, 300);
    },
    bug_near_window_edge: function () {
        this.near_edge = 0;

        if (this.bug.top < this.options.edge_resistance){
            this.near_edge |= this.NEAR_TOP_EDGE;
        } else if (this.bug.top > document.documentElement.clientHeight - this.options.edge_resistance) {
            this.near_edge |= this.NEAR_BOTTOM_EDGE;
        }

        if (this.bug.left < this.options.edge_resistance){
            this.near_edge |= this.NEAR_LEFT_EDGE;
        }else if (this.bug.left > document.documentElement.clientWidth - this.options.edge_resistance) {
            this.near_edge |= this.NEAR_RIGHT_EDGE;
        }

        return this.near_edge;
    },
    getPos: function () {
        if (this.inserted && this.bug && this.bug.style) {
            return {
                'top': parseInt(this.bug.style.top, 10),
                'left': parseInt(this.bug.style.left, 10)
            };
        }
        return null;
    }
};

var SpawnBug = function () {
    var newBug = {},
        prop;
    for (prop in Bug) {
        if (Bug.hasOwnProperty(prop)) {
            newBug[prop] = Bug[prop];
        }
    }
    return newBug;
};