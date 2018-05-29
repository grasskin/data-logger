const electron = require("electron");
const url = require("url");
const path = require("path");
const windowStateKeeper = require('electron-window-state');
const serialport = require("serialport");
const storage = require('electron-store');

const {app, BrowserWindow, Menu, ipcMain, dialog} = electron; // electron import
const { Transform } = require('stream');
const store = new storage();

let mainWindow;
let serialWindow;
var arduinoSerialPort; // To catch undefined
let parser; // Parses arduino data
let output;
let dataStreamNumber; // number of data streams

//TODO edit plotly text language
//TODO Garbage collecting

process.env.NODE_ENV = "production"

//Convert arduino data to comasplit
const commaSplitter = new Transform({
  readableObjectMode: true,
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().trim().split(/\s+/).filter(it => it.search(/[^0123456789,.]+/g)===-1?true:false));
    callback();
  }
});

// Start when app ready
app.on("ready", function() {
	let mainWindowState = windowStateKeeper({
	    defaultWidth: 900,
	    defaultHeight: 670
	  });

	mainWindow = new BrowserWindow({
		'x': mainWindowState.x,
	    'y': mainWindowState.y,
	    'width': mainWindowState.width,
	    'height': mainWindowState.height,
	    "show": false
	});

	mainWindow.once("ready-to-show", () => {
		mainWindow.show();
		mainWindow.focus();
	})

	mainWindowState.manage(mainWindow); // Store window size

	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, "main.html"),
		protocol: "file:",
		slashes: true
	}));
	
	mainWindow.on("closed", function() {
		app.quit();
	})

	//Build menu
	const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
	mainWindow.setMenu(mainMenu);
})

// Creates serial option menu
function createSerialWindow() {
	serialWindow = new BrowserWindow({
		width: 420,
		height: 310,
		"show": false
	});

	serialWindow.setMenu(null);

	serialWindow.once("ready-to-show", () => {
		serialWindow.show();
		serialWindow.focus();
	})

	serialWindow.loadURL(url.format({
		pathname: path.join(__dirname, "serialSelector.html"),
		protocol: "file:",
		slashes: true
	}));
	// Garbage collection
	serialWindow.on("closed", function(){
		serialWindow = null;
	});
}

// Diferentes configs
ipcMain.on("config:serial-port", function(e, serialsetup) {
	try {
    //console.log(serialsetup);
    if(arduinoSerialPort !== undefined){
    	// Handle previous connection + garbage collection
    	arduinoSerialPort.pause();
    	arduinoSerialPort.flush();
    	arduinoSerialPort.unpipe(parser);
    	parser.unpipe(output);
    	parser = null;
    	output = null;
    	dataStreamNumber = null;
     	arduinoSerialPort.close(() => {
     		createArduinoSerial(serialsetup);
     	});
 		//console.log("Reconect");
 	} else {
 		// Connection has never been created
 		createArduinoSerial(serialsetup);
 	}

	
	serialWindow.close();
	} catch (ex){
		//console.log(ex);
	}
})

function createArduinoSerial(serialsetup){
	// Create new serial connection
	arduinoSerialPort = null;
	arduinoSerialPort = new serialport(serialsetup["port"], {baudRate: parseInt(serialsetup["baud-rate"])});
	mainWindow.webContents.send("arduino:data-stream-number", serialsetup["data-streams"]);
	try {
	parser = arduinoSerialPort.pipe(new serialport.parsers.Readline({delimiter: "\r"}));
	output = parser.pipe(commaSplitter);
	} catch (err){
		//console.log(err);
	}
	arduinoSerialPort.on("error", function(err) {
		dialog.showErrorBox("Error de serial", err.message);
	});
	arduinoSerialPort.on("open", function(){
		arduinoSerialPort.on("data", function(data){
		})
	});
	output.on("data", (data) => {
		mainWindow.webContents.send("arduino:data", data);
	})

}



// Menu template
const mainMenuTemplate = [
	{
		label: "Archivo",
		submenu: [
			{
				label: "Salir",
				accelerator: process.platform == "darwin"? "Command+Q": "Ctrl+Q",
				click(){
					app.quit();
				}
			}
			]
	},
	{
		label: "Configuración",
		submenu: [
			{
				label: "Serial",
				click(){
					createSerialWindow();
				},
				accelerator: process.platform == "darwin"? "Command+N": "Ctrl+N"
			},
			{
				label: "Restaurar configuración predeterminada",
				click(){
					store.clear();
				}
			}
		]
	},
	{
		label: "Ventana",
		submenu: [
			{
				label: "Restaurar ventana a tamaño predeterminado",
				click(){
					mainWindow.setSize(900, 670);
				}
			}
		]
	}
]

// Mac menu optimization
if(process.platform == "darwin") mainMenuTemplate.unshift({});

if(process.env.NODE_ENV !== "production"){
	mainMenuTemplate.push({
		label: "Developer Options",
		submenu: [
			{
				label: "Toggle DevTools",
				accelerator: "Ctrl+Shift+I",
				click(item, focusedWindow){
					focusedWindow.toggleDevTools();
				},
			},
			{
				role: "reload"
			}
		]
	})
}