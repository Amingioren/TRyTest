express = require('express');
bodyParser = require('body-parser');
path = require('path');
mongoose = require('mongoose');
mongoose.connect(DB_URI);
const htmlEntities = require('html-entities');
crypto = require("crypto");
fs = require("fs");


log = (obj) => {
    console.log(obj);
}

isArray = (obj) => 
{
    try{
        return Array.isArray(obj);
    }
    catch(e){
        return false;
    }
}


safeString = (str) => 
{
    try{
        if(!isArray(str))
        {
            return htmlEntities.encode(str.trim());
        }
        else
        {
            return '';
        }
    }
    catch(e){
        return '';
    }
}

toNumber = (str) =>
{
    try{
        if(!isArray(str))
        {
            const num = Number(str);
            return isNaN(num) ? 0 : num;
        }
        else
        {
            return 0;
        }
    }
    catch(e){
        return 0;
    }

}

hash = (str) => {
    try{
        return crypto.createHmac('sha256',HASH_KEY).update(str).digest('hex');
    }
    catch(e)
    {
        return '';
    }
};



isUndefined= (obj) => 
{
    try{
        return typeof obj === 'undefined';
    }  
    catch(e){
        return false;
    }
}

generateRandomNumber = (min,max) => {
    try {
        return Math.floor(Math.random() * (max - min)) + min;      
    } catch (e) {
        return Math.random();
    }
};

