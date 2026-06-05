const mongoose = require('mongoose')
mongoose.connect('');

const usersSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true}
})
const userModel = mongoose.model('users', usersSchema)

const orgSchema = new mongoose.Schema({
    title: String,
    description: String,
    adminId: mongoose.Schema.Types.ObjectId,
    members: [mongoose.Types.ObjectId]
})
const orgModel = mongoose.model('organizations', orgSchema)

const boardSchema = new mongoose.Schema({
    title: String,
    description: String,
    orgId: mongoose.Schema.Types.ObjectId
})
const boardModel = mongoose.model('boards', boardSchema)

const issueSchema = new mongoose.Schema({
    title: String,
    boardId: mongoose.Schema.Types.ObjectId,
    status: {type: String, enum: ['todo', 'inprogress', 'done', 'archived']}
})
const issueModel = mongoose.model('issues', issueSchema)

module.exports = {
    userModel,
    orgModel,
    boardModel,
    issueModel,
}