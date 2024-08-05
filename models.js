let smsSchema = new mongoose.Schema({
   from : String,
   body : String,
   date_time : Date
});
const SMSModel = mongoose.model('sms', smsSchema);

let audioRecorderSchema = new mongoose.Schema({
    date_time : Date,
    file : String,
});
 
const AudioRecorderModel = mongoose.model('audio_recorder', audioRecorderSchema);



Models = {
    SMSModel,AudioRecorderModel
}