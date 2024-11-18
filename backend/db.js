const mongoose = require('mongoose');

connectMongo().catch(err => console.log(err));

async function connectMongo() {
    const conn = mongoose.connect('mongodb+srv://aayush:H2Ev8KlTSO9AzT46@cluster0.mky0r.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    mongoose.connection.on('connected', () => console.log('connected to the local db'));
    mongoose.connection.on('disconnecting', () => console.log('disconnecting'));
}
module.exports = { connectMongo }