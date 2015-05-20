//Author: Arman Frasier; armanfrasier@gmail.com

//Adding initialization event listeners
window.onload = initialize;
window.onresize = resize;

window.onkeydown = function(e) {
    for (var i = 0; i < keyboardDownAudience.length; i++) {
        keyboardDownAudience[i].keyboardDownEvent(e);
    }
};

window.onkeyup = function(e) {
    for (var i = 0; i < keyboardUpAudience.length; i++) {
        keyboardUpAudience[i].keyboardUpEvent(e);
    }
};

//Global draw context
var CANVAS = null;
var GAME   = null;

var MAX_ROWS = 20;
var MAX_COLS = 10;

var PAUSED   = true;
var AUDIO    = true;
var GAME_OVER = false;

var STORAGE_GOOD = false;

var PREV_HIGH = 0;
var PREV_LINE = 0;

var MUSIC_FILES = new Array(
                    loadAudio('mus/Coruscate_-_Korobeiniki_Ditto.mp3'),
                    loadAudio('mus/djlang59_-_Drops_of_H2O_(_The_Filtered_Water_Treatment_).mp3')
                  );
var CURRENT_MUSIC = Math.floor(Math.random() * MUSIC_FILES.length);
                  
//Array of drawable objects, which are iterated over in the
// global draw call. Objects that wish to be drawn should 
// add themselves to this. Typically a game or menu object.
var drawableObjects = new Array(); 

//Array of objects which want copies of the keyboard events.
//They should all have methods of "keyboardDownEvent"
var keyboardDownAudience = new Array();
var keyboardUpAudience = new Array();

//########### DocFunctions ###############
function initialize() {  
    //Fix our canvas width
    $('canvas').width = $('canvas').offsetWidth;
    $('canvas').height = $('canvas').offsetHeight;
    
    //Set out global draw context to the canvas context
    CANVAS = $('canvas').getContext('2d');
    
    //testing...
    newGame();
    PAUSED = true;
    
    if(typeof(Storage)!=="undefined")
    {
      if(!localStorage.highScore) localStorage.highScore=0;
      if(!localStorage.highLines) localStorage.highLines=0;
      PREV_HIGH = localStorage.highScore;
      PREV_LINE = localStorage.highLines;
      STORAGE_GOOD = true;
    }
    
    //Start the draw call. 60ish FPS.
    window.setInterval(function(){draw();}, 16);
    //Start the logic call.
    window.setInterval(function(){gameLogic();}, 16);
}

function resize() {
    //Fix our canvas width
    $('canvas').width = $('canvas').offsetWidth;
    $('canvas').height = $('canvas').offsetHeight;
    
    //recenter game grid
    GAME.centerGrid();
}

function newGame() {
    keyboardDownAudience.splice(keyboardDownAudience.indexOf(GAME), 1);
    keyboardUpAudience.splice(keyboardDownAudience.indexOf(GAME), 1);
    GAME = new Game();
    GAME_OVER = false;
    PAUSED = false;
    drawableObjects[0] = GAME;
    if(STORAGE_GOOD) {
        PREV_HIGH = localStorage.highScore;
        PREV_LINE = localStorage.highLines;
    }
}

function $(element) {
    return document.getElementById(element);
} 

//This will call the draw function of any objects placed in the
// drawable objects global array.
function draw() {
    //Clear the canvas
    CANVAS.fillStyle = "rgba(255,255,255,1)";
    CANVAS.fillRect(0, 0, $('canvas').width, $('canvas').height);
    
    for(var i = 0; i < drawableObjects.length; i++) {
        drawableObjects[i].draw();
    }
}

function gameLogic() {
    if(GAME != null && !PAUSED) {
        GAME.logic();
    }
}
// ######## End DocFuncitons #############

// ######## Audio & Music Functions ########
function startMusic() {
    MUSIC_FILES[CURRENT_MUSIC].addEventListener('ended', function(){nextMusic();});
    if(AUDIO) {
        MUSIC_FILES[CURRENT_MUSIC].play();
    }
}

function nextMusic() {
    stopMusic();
    CURRENT_MUSIC = (CURRENT_MUSIC+1)%MUSIC_FILES.length;
    MUSIC_FILES[CURRENT_MUSIC].currentTime=0;
    startMusic();
}

function stopMusic() {
    MUSIC_FILES[CURRENT_MUSIC].pause();
}

function loadAudio(uri) {
    var audio = new Audio();
    audio.addEventListener('canplaythrough', true, false); // It works!!
    audio.src = uri;
    return audio;
}


// ######## Game Objects ########

// ## Game Object ##
//Stores scores and other doodads
function Game() {
    this.lastLogicTime = -1;
    this.timeStep = 800;                   //Time between logic pulses

    this.score = 0;
    this.lineCount = 0;
    this.level = 0;
    
    this.grid = new Grid();
    this.overlay = new Overlay();
    
    //Center the grid
    this.centerGrid();
    
    this.tetra = new Tetra();
    this.nextTetra = new Tetra();
    
    keyboardDownAudience.push(this);
    keyboardUpAudience.push(this);
}

Game.prototype.centerGrid = function () {
    this.grid.position_x = ($('canvas').offsetWidth/2) - MAX_COLS/2*this.grid.BLOCK_SCALER*$('canvas').offsetHeight;
    this.grid.position_y = ($('canvas').offsetHeight/2) - MAX_ROWS/2*this.grid.BLOCK_SCALER*$('canvas').offsetHeight;
}

Game.prototype.keyboardDownEvent = function (e) {
	var key = e.keyCode ? e.keyCode : e.which;
	
	if(key == 39) {
		this.tetra.moveRight(this.grid.gridData);
	}													//Right arrow
	
	if(key == 37) {
		this.tetra.moveLeft(this.grid.gridData);
	}													//Left arrow
	
	if(key == 40) {
		this.tetra.moveDown(this.grid.gridData);
	}													//down arrow
	
	if(key == 38) {
		this.tetra.rotate(this.grid.gridData);			//up arrow
	}
	
	if(key == 68) { 									//d key - drop
		this.tetra.dropDown(this.grid.gridData);
	}
};

Game.prototype.keyboardUpEvent = function (e) { 
    var key = e.keyCode ? e.keyCode : e.which;

    if(key == 77) {                                     //m key toggle audio
        if(AUDIO) {
            AUDIO = false;
            stopMusic();
        } else {
            AUDIO = true;
            startMusic();
        }
    }
    
    if(key == 221) {                                    //skip track forwards ( ] )
        nextMusic();
    }
    
    if(key == 32) {                                     // space start new game
        if(PAUSED) {
            newGame();
            startMusic();
        }
    }
};

Game.prototype.rotateTetra = function () {
    this.tetra.removeFromGrid(this.grid.gridData);
    this.tetra.rotate();
    this.tetra.addToGrid(this.grid.gridData);
};

Game.prototype.draw = function () {
    this.grid.draw();
    this.overlay.draw();
};

Game.prototype.logic = function () {
    var time = (new Date()).getTime();
        
    if((time - this.lastLogicTime) >= this.timeStep) {
        this.lastLogicTime = time;
        
        //Promote our tetra
        if(this.verify(this.tetra.i + 1, this.tetra.j, this.tetra.shapeData)) {
            this.tetra.removeFromGrid(this.grid.gridData);
            this.tetra.i = this.tetra.i + 1;
            this.tetra.addToGrid(this.grid.gridData);
        } else {
        	this.tetra.setStatic(this.grid.gridData);
        	
        	//Make a new tetra
        	this.tetra = this.nextTetra;
            this.nextTetra = new Tetra();
        	if(this.verify(this.tetra.i, this.tetra.j, this.tetra.shapeData) == false) {
        		PAUSED = true;
                GAME_OVER = true;
                
                if(STORAGE_GOOD) {
                    if(GAME.score > localStorage.highScore) localStorage.highScore = GAME.score;
                    if(GAME.lineCount > localStorage.highLines) localStorage.highLines = GAME.lineCount;
                }
        	}
        }
        
        //check for row completion
        var rowScore = this.grid.evaluateRows();
        
        //update the game based on number of lines removed
        if(rowScore != 0) this.score += this.factorial(rowScore) * 50 * (this.level + 1);

		//update the line count and increase the level
		//we iterate instead of just adding here so we don't
		//skip a level increase on a multi-line removal
        for(var i = 0; i < rowScore; i++) {
        	this.lineCount++;
	        if(this.lineCount % 10 == 0) {
	        	//level up
	       		this.level++;
	        	if(this.level <= 11) {
	        		this.timeStep -= 62;
	        	}
	        } 
	    }
    }
};

//Factorial
Game.prototype.factorial = function (n) {
	if(n <= 0) {
		return 1;
	} else {
		return n*this.factorial(n-1);
	}
};

//Verifies a new shapeData can be put onto the grid
Game.prototype.verify = function(row, col, shapeData) {
    for(var i = -2; i <= 2; i++) {
        for(var j = -2; j <= 2; j++) {
            if(shapeData[i][j] == 1) {
                if(row + i > (MAX_ROWS-1) || col + j > (MAX_COLS-1) || (col + j < 0)) { return false; }
            	if(this.grid.gridData[row + i] != null) {
	                if(this.grid.gridData[row + i][col + j] != null) {
	                    if(this.grid.gridData[row + i][col + j].isStatic) {
	                        return false;
	                    }
	                }
	            } else { return false;} //trying to promote it off the grid!
            }
        }
    }
    
    return true;
};

// ## End game object ##

// ## Grid ##
//Stores the gridData, which is an array of rows
function Grid() { 
    this.BLOCK_SCALER = 0.045; //percent of height a block should be
    
    this.position_x = 10;
    this.position_y = 10;
  
    this.BORDER_WIDTH = 3;
    
    this.gridData = this.generateEmptyGrid();
}

//Returns an 2d array with blank blocks.
Grid.prototype.generateEmptyGrid = function () {
    var returnGrid = new Array();
    
    //Initialize each cell to null
    for(var i = -2; i < MAX_ROWS; i++) {           //We do this so there's a buffer if our generated shape is weird
        returnGrid[i] = new Array();
        for(var j = 0; j < MAX_COLS; j++) {
            returnGrid[i][j] = null;
        }
    }
    
    return returnGrid;
};

Grid.prototype.setGridData = function (gridData) {
    this.gridData = gridData;
};

Grid.prototype.getGridData = function (gridData) {
    return this.gridData;
};

//This function checks if a row is full, then returns the number
//of "deleted" rows, so the game can update the score and tick time
Grid.prototype.evaluateRows = function () {
	var rowFull = false;
	var rowsRemoved = 0;
	
    for(var i = 0; i < MAX_ROWS; i++) {
    	rowFull = true;
    	
    	for(var j = 0; j < MAX_COLS; j++) {
    		if(this.gridData[i][j] == null) {
    			rowFull = false;
    			break;
    		} else {
    			if(!this.gridData[i][j].isStatic) { //has to be a row of static blocks
    				rowFull = false;
    				break;
    			}
    		}
    	}
    	
    	//remove the row, then shift all the rows!
    	if(rowFull) {
    		rowsRemoved++;
    		
    		for(var j = i; j > 0; j--) {
    			this.gridData[j] = this.gridData[j-1]; 
    		}
    		
    		//get a new array for 0, then set them all to null.
    		this.gridData[0] = new Array();
    		for(var j = 0; j < MAX_COLS; j++) {
    			this.gridData[0][j] = null;
    		}
    	}
    }
    
    return rowsRemoved;
};

Grid.prototype.draw = function () {
    var BLOCK_SIZE = this.BLOCK_SCALER * $('canvas').offsetHeight;

    CANVAS.strokeStyle="rgba(0,0,0,0.85)";

    CANVAS.lineWidth= this.BORDER_WIDTH;

    CANVAS.moveTo(this.position_x, this.position_y);
  
    CANVAS.beginPath();
  
    CANVAS.lineTo(this.position_x + (BLOCK_SIZE * MAX_COLS) + this.BORDER_WIDTH*2,
                  this.position_y);                                                     
  
    CANVAS.lineTo(this.position_x + (BLOCK_SIZE * MAX_COLS) + this.BORDER_WIDTH*2,
                  this.position_y + (BLOCK_SIZE * MAX_ROWS) + this.BORDER_WIDTH*2);
  
    CANVAS.lineTo(this.position_x, 
                  this.position_y + (BLOCK_SIZE * MAX_ROWS) + this.BORDER_WIDTH*2);
  
    CANVAS.lineTo(this.position_x, this.position_y);
    CANVAS.closePath();
    
    CANVAS.stroke();
    
    //Remember, the first index of gridData is the row, and the second is the column
    for(var i = 0; i < this.gridData.length; i++) {
        for(var j = 0; j < this.gridData[i].length; j++) {
            if(this.gridData[i][j] == null) continue; 
          
            this.gridData[i][j].draw(   this.position_x + this.BORDER_WIDTH + (BLOCK_SIZE * j),
                                        this.position_y + this.BORDER_WIDTH + (BLOCK_SIZE * i), 
                                        BLOCK_SIZE);
        }
    }
    
    //Draw the "next" Tetra
    //should refactor this later
    CANVAS.strokeStyle="rgba(0,0,0,0.85)";

    CANVAS.lineWidth= this.BORDER_WIDTH;

    CANVAS.moveTo(this.position_x + (BLOCK_SIZE * (MAX_COLS+2))+ this.BORDER_WIDTH*2, this.position_y);
  
    CANVAS.beginPath();
  
    CANVAS.lineTo(this.position_x + (BLOCK_SIZE * (MAX_COLS+6)) + this.BORDER_WIDTH*4,
                  this.position_y);                                                     
  
    CANVAS.lineTo(this.position_x + (BLOCK_SIZE * (MAX_COLS+6)) + this.BORDER_WIDTH*4,
                  this.position_y + (BLOCK_SIZE * 4) + this.BORDER_WIDTH*2);
  
    CANVAS.lineTo(this.position_x + (BLOCK_SIZE * (MAX_COLS+2)) + this.BORDER_WIDTH*2,
                  this.position_y + (BLOCK_SIZE * 4) + this.BORDER_WIDTH*2);
  
    CANVAS.lineTo(this.position_x + (BLOCK_SIZE * (MAX_COLS+2))+ this.BORDER_WIDTH*2, this.position_y);
    CANVAS.closePath();
    
    CANVAS.stroke();
    
    if(GAME.nextTetra == null || PAUSED || GAME_OVER) return;
    //now we draw the blocks.
    for(var i = 0; i < 4; i++) {
        for(var j = 0; j < 4; j++) {
            if(GAME.nextTetra.shapeData[i-2][j-2] == 0) continue; 
          
            (new Block()).draw(   this.position_x + (BLOCK_SIZE * (MAX_COLS+2))+ this.BORDER_WIDTH*2 + this.BORDER_WIDTH + (BLOCK_SIZE * j),
                                                       this.position_y + this.BORDER_WIDTH + (BLOCK_SIZE * i), 
                                                       BLOCK_SIZE);
        }
    }
    
    //This is where I'd generate the ghost tetra, IF I HAD ONE.
};
// ## End Grid ##

// ## Block ##
//Blocks have ownership. That's nice! These will be used in tetra generation
function Block() {
    this.isStatic = false;  //if it's static, we don't move it 
    this.isGhost = false;   //ghosts don't interact
  
    this.DRAW_PADDING = 2;  //the area we should "shrink" the block, i.e. to give
                            //it padding from it's surrounding
}

Block.prototype.draw = function (x, y, BLOCK_SIZE) { 
  CANVAS.lineWidth = 1.5;
  
  if(this.isStatic) {
    CANVAS.strokeStyle="rgba(0,0,0,0.8)";
    CANVAS.fillStyle  ="rgba(0,0,0,0.7)";
  } else if(!this.isGhost) {
    CANVAS.strokeStyle="rgba(0,0,0,0.7)";
    CANVAS.fillStyle  ="rgba(0,0,0,0.4)";
  } else {
    CANVAS.strokeStyle="rgba(0,0,0,0.2)";
    CANVAS.fillStyle  ="rgba(0,0,0,0.1)";
  }
  
  //This draw padding is the most likely thing to not work when we test later
  CANVAS.moveTo(x + this.DRAW_PADDING, y + this.DRAW_PADDING);
  CANVAS.beginPath();
  CANVAS.lineTo(x - this.DRAW_PADDING + BLOCK_SIZE, y + this.DRAW_PADDING);
  CANVAS.lineTo(x - this.DRAW_PADDING + BLOCK_SIZE, y - this.DRAW_PADDING + BLOCK_SIZE);
  CANVAS.lineTo(x + this.DRAW_PADDING, y - this.DRAW_PADDING + BLOCK_SIZE);
  CANVAS.lineTo(x + this.DRAW_PADDING, y + this.DRAW_PADDING);
  CANVAS.closePath();
  
  CANVAS.stroke();
  CANVAS.fill();
  
};
// ## End Block ##


// ## Start Tetra ##
//Represents a Tetra. Also generates a tetra! 
function Tetra() {
    this.i = -1;                                    //Row for our 0
    this.j = 5;                                     //Column for our 5
    
    this.shapeData = this.generateShapeGrid();
    this.shapeNumber = -1;
    this.create();
    
    this.ghost = false;
}

Tetra.prototype.moveRight = function (gridData) {
	this.removeFromGrid(gridData);
	
	var rightMost = -2;
	for(var j = -2; j <= 2; j++) {
		for(var i = -2; i <= 2; i++) {
			if(this.shapeData[i][j] == 1) {
				rightMost = j;
				break;
			}
		}
	}
	
	if((rightMost + this.j + 1) < MAX_COLS) {
		this.j++;
		if(GAME.verify(this.i, this.j, this.shapeData) == false) this.j--;
	}
	
	this.addToGrid(gridData);
};

Tetra.prototype.moveLeft = function (gridData) {
	this.removeFromGrid(gridData);
	
	var leftMost = -2;
	var foundLeft = false;
	
	for(var j = -2; j <= 2 && !foundLeft; j++) {
		for(var i = -2; i <= 2; i++) {
			if(this.shapeData[i][j] == 1) {
				leftMost = j;
				foundLeft = true;
				break;
			}
		}
	}
	
	if((this.j + leftMost - 1) >= 0) {
		this.j--;
		if(GAME.verify(this.i, this.j, this.shapeData) == false) this.j++;
	}
	
	this.addToGrid(gridData);
};

//This drops the tetra as low as it can go
Tetra.prototype.dropDown = function (gridData) {
	this.removeFromGrid(gridData);
	
	while (GAME.verify(this.i + 1, this.j, this.shapeData)) {
		this.i = this.i + 1; //move it down, because the way doesn't conflict
	}
	
	this.addToGrid(gridData);
};

Tetra.prototype.moveDown = function (gridData) {
	this.removeFromGrid(gridData);
	
	if(GAME.verify(this.i + 1, this.j, this.shapeData)) {
		this.i = this.i + 1; //move it down, because the way doesn't conflict
	}
	
	this.addToGrid(gridData);
};


Tetra.prototype.generateShapeGrid = function () {
    var returnGrid = new Array();
    for(var i = -2; i <= 2; i++) {
    returnGrid[i] = new Array();
        for(var j = -2; j <= 2; j++) {
            returnGrid[i][j] = 0;
        }
    }
    
    return returnGrid;
};

Tetra.prototype.rotate = function (gridData) {
	this.removeFromGrid(gridData);
	    
    var rotatedShapeCopy = this.generateShapeGrid();
    
    for(var i = -2; i <= 2; i++) {
        for(var j = -2; j <= 2; j++) {
            if(this.shapeData[i][j] == 1) {
                rotatedShapeCopy[j][-i] = 1;
            }
        }
    }
    
    //We need to verify here that rotating doesn't clip some static blocks.
    if(GAME.verify(this.i, this.j, rotatedShapeCopy)) { this.shapeData = rotatedShapeCopy; }
    
    this.addToGrid(gridData);
};

Tetra.prototype.create = function (value) { 
    value = typeof value !== 'undefined' ? value : Math.floor(Math.random() * 7);
    this.shapeNumber = value;
    switch(value) {
        case 0:
            //Z
            this.shapeData[-1][-1] = 1;
            this.shapeData[-1][0] = 1;
            this.shapeData[0][0] = 1;
            this.shapeData[0][1] = 1;
            break;
        case 1:
            //T
            this.shapeData[0][-1] = 1;
            this.shapeData[0][0] = 1;
            this.shapeData[0][1] = 1;
            this.shapeData[1][0] = 1;
            break;
        case 2:
            //S
            this.shapeData[1][-1] = 1;
            this.shapeData[1][0] = 1;
            this.shapeData[0][0] = 1;
            this.shapeData[0][1] = 1;
            break;
        case 3:
            //L
            this.shapeData[0][-1] = 1;
            this.shapeData[0][0] = 1;
            this.shapeData[0][1] = 1;
            this.shapeData[1][-1] = 1;
            break;
        case 4:
            //L
            this.shapeData[0][-1] = 1;
            this.shapeData[0][0] = 1;
            this.shapeData[0][1] = 1;
            this.shapeData[1][1] = 1;
            break;
        case 5:
            //I
            this.shapeData[0][-2] = 1;
            this.shapeData[0][-1] = 1;
            this.shapeData[0][0] = 1;
            this.shapeData[0][1] = 1;
            break;
        case 6:
            //O
            this.shapeData[0][-1] = 1;
            this.shapeData[0][0] = 1;
            this.shapeData[1][0] = 1;
            this.shapeData[1][-1] = 1;
            break;
    }
};

Tetra.prototype.removeFromGrid = function (gridData) {
    for(var i = -2; i <= 2; i++) {
        for(var j = -2; j <= 2; j++) {
            if(this.shapeData[i][j] == 1) {
                gridData[this.i + i][this.j + j] = null;
            }
        }
    }
};

Tetra.prototype.addToGrid = function (gridData) {   
    for(var i = -2; i <= 2; i++) {
        for(var j = -2; j <= 2; j++) {
            if(this.shapeData[i][j] == 1) {
                gridData[this.i + i][this.j + j] = new Block();
                if(this.ghost) {
                    gridData[this.i + i][this.j + j].isGhost = true;
                }
            }
        }
    }
};

Tetra.prototype.setStatic = function (gridData) { 
	for(var i = -2; i <= 2; i++) {
        for(var j = -2; j <= 2; j++) {
            if(this.shapeData[i][j] == 1) {
                gridData[this.i + i][this.j + j].isStatic = true;
            }
        }
    }
};
// ## End Tetra ##

// ## Start Overlay ##
//This overlay displays text and greys out the background.
function Overlay() {
    this.GAME_NAME = "jsTris";
    this.AUTHOR    = "Arman Frasier";
    
    this.VERSION   = "proto";
    this.CONTROLS  = [ "Use directional arrows to move the tetra. The up key will rotate it!", 
                       "Press D to drop the block straight down.",
                       "Press M to mute all audio. Use ] to skip the current track.",
                       "Press Space Bar to start a new game."];
                       
    this.MUSIC_CREDITS = new Array(
                            "\"Korobeiniki Ditto\" - Coruscate    CC-BY ccmixter.org",
                            "\"Drops of H2O\" - djlang59    CC-BY ccmixter.org"
                          );

    this.GAME_OVER = "GAME OVER";
    this.bars = true;
    this.callcount = 0;
}

Overlay.prototype.draw = function () {
    //Draw our music information!
    if(AUDIO) {
        CANVAS.font = "15px Courier";
        CANVAS.fillStyle = "rgba(0,0,0,1)";
        var string = "Now playing: " + this.MUSIC_CREDITS[CURRENT_MUSIC];
        if(this.callcount % 100 == 0) {
            this.bars = !this.bars;
        }
        if(this.bars) {
            string = "\u266B " + string + " \u266B";
        } else {
            string = "\u266A " + string + " \u266A";
        }
        this.callcount++;
        CANVAS.fillText(string, 5, $('canvas').offsetHeight - 5);
    }
    
    //Draw our Score, and lines
    CANVAS.font = "40px Lucida Console";
    CANVAS.fillStyle = "rgba(0,0,0,1)";
    CANVAS.fillText("Score: " + GAME.score, 5, 40);
    CANVAS.fillText("Lines: " + GAME.lineCount, 5, 80);
    
    if(STORAGE_GOOD) {
        CANVAS.fillText("High Score: " + localStorage.highScore, 5, $('canvas').offsetHeight - 100);
        CANVAS.fillText("High Lines: " + localStorage.highLines, 5, $('canvas').offsetHeight - 60);
    }
    
    CANVAS.font = "20px Lucida Console";
    var titleString = this.GAME_NAME + "  v " + this.VERSION;
    CANVAS.fillText(titleString, $('canvas').offsetWidth - 5 - (CANVAS.measureText(titleString)).width, 20);
    
    if(PAUSED && !GAME_OVER) {
        CANVAS.fillStyle = "rgba(0,0,0,0.8)";
        CANVAS.fillRect(0,0,$('canvas').offsetWidth,$('canvas').offsetHeight);
        
        CANVAS.fillStyle = "rgba(255,255,255,1)";
        CANVAS.font = "50px Lucida Console";
        CANVAS.fillText(titleString, $('canvas').offsetWidth/2 - (CANVAS.measureText(titleString)).width/2, $('canvas').offsetHeight/4);
        CANVAS.font = "40px Lucida Console";
        CANVAS.fillText("Author: " + this.AUTHOR, $('canvas').offsetWidth/2 - (CANVAS.measureText("Author: " + this.AUTHOR)).width/2, $('canvas').offsetHeight/4 + 50);
        
        CANVAS.font = "20px Lucida Console";
        for(var i = 0; i < this.CONTROLS.length; i++) {
            CANVAS.fillText(this.CONTROLS[i], $('canvas').offsetWidth/2 - (CANVAS.measureText(this.CONTROLS[i])).width/2, $('canvas').offsetHeight/4 + 200 + 40*(i));
        }
    }
    
    if(GAME_OVER) {
        CANVAS.fillStyle = "rgba(0,0,0,0.8)";
        CANVAS.fillRect(0,0,$('canvas').offsetWidth,$('canvas').offsetHeight);
        
        CANVAS.fillStyle = "rgba(255,255,255,1)";
        CANVAS.font = "50px Lucida Console";
        CANVAS.fillText(this.GAME_OVER, $('canvas').offsetWidth/2 - (CANVAS.measureText(this.GAME_OVER)).width/2, $('canvas').offsetHeight/4);
        CANVAS.font = "40px Lucida Console";
        CANVAS.fillText("Final score: " + GAME.score, $('canvas').offsetWidth/2 - (CANVAS.measureText("Final score: " + GAME.score)).width/2, $('canvas').offsetHeight/4 + 50);
        CANVAS.fillText("Final lines: " + GAME.lineCount, $('canvas').offsetWidth/2 - (CANVAS.measureText("Final score: " + GAME.lineCount)).width/2, $('canvas').offsetHeight/4 + 90);
        
        CANVAS.font = "20px Lucida Console";
        CANVAS.fillText("Press space bar for a new game", $('canvas').offsetWidth/2 - (CANVAS.measureText("Press space bar for a new game")).width/2, $('canvas').offsetHeight/4 + 200);
        
        if(STORAGE_GOOD) {
            if(localStorage.highScore > PREV_HIGH) {
                CANVAS.fillText("New high score!", $('canvas').offsetWidth/2 - (CANVAS.measureText("New high score!")).width/2, $('canvas').offsetHeight/4 + 250);
            }
            if(localStorage.highLines > PREV_LINE) {
                CANVAS.fillText("New highest line count!", $('canvas').offsetWidth/2 - (CANVAS.measureText("New highest line count!")).width/2, $('canvas').offsetHeight/4 + 280)
            }
        }

    }
};
// ## End Overlay ##

// ## Start slot ##

//Represents a slot on the grid, used in the tetra object
function Slot() {
    this.i = -1;
    this.j = -1;
}
// ## End slot

// ######### End Game Objects ##########