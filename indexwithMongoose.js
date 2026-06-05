const express = require('express')
const path = require('path')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const {userModel, orgModel, boardModel, issueModel} = require('./Week12xmodels')

const app = express()
const SECRET_KEY = 'secrethai'

app.use(express.json())
app.use(cors())
app.use(express.static(__dirname))

function authMiddleware(req, res, next){
    const token = req.headers.token
    if(!token) {
        return res.status(403).json({error:'unauthorized'})
    }
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        if (!decoded.userId) {
            return res.status(403).json({ error: 'unauthorized' });
        }
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'invalid or expired token' });
    }
}

// post routes
app.post('/signup', async(req, res) => {
    const username = req.body.username
    const password = req.body.password
    const userExists = await userModel.findOne({username})
    if (userExists) {
        return res.status(403).json({ message: 'User already exists' })
    }
    const user = await userModel.create({username, password})
    res.json({ message: 'you have signed up successfully', userId: user._id })
})

app.post('/signin', async (req, res) => {
    const username = req.body.username
    const password = req.body.password
    const userExists = await userModel.findOne({username, password})
    if (!userExists) {
        return res.status(403).json({ message: 'Please signup first' })
    }
    const token = jwt.sign({
        userId: userExists._id
    }, SECRET_KEY)
    res.json({
        message: 'you have signed in successfully',
        token
    })
})

app.post('/organization', authMiddleware, async(req, res) => {
    const title = req.body.title
    const description = req.body.description
    const org = await orgModel.create({
        title,
        description,
        adminId: req.userId,
        
    })
    res.status(201).json({
        orgId: org._id,
        message: 'Organization created successfully'
    })
})

app.post('/add-member-to-org', authMiddleware, async (req, res) => {
    const userId = req.userId
    const orgId = req.body.orgId
    const memberUsername = req.body.memberUsername
    const org = await orgModel.findOne({_id: orgId})
    if(!org || org.adminId.toString() !== userId){ // cannot compare objectId to an string so we converted one to string.
        return res.status(403).json({message: 'either the org does not exist or you are not the admin'})
    }
    const member = await userModel.findOne({username: memberUsername})
    if(!member){
        return res.status(403).json({message: 'no user with this username'})
    }
    
    /*await orgModel.updateOne({
        _id: orgId
    },{
        $push: {
            "members": member._id
        }
    })*/
    // the methord of $push not working so we doing by below methord
    org.members.push(member._id)
    await org.save()
    res.json({ message: 'user added to org successfully' })
})

app.post('/board', authMiddleware, async (req, res) => {
    const userId = req.userId
    const orgId = req.body.orgId
    const boardTitle = req.body.boardTitle
    const boardDisc = req.body.boardDisc
    const org = await orgModel.findOne({_id: orgId})
    if (!org || org.adminId.toString() !== userId) {
        return res.status(404).json({ message: "either the org does not exist or you are not the admin of the org" })
    }
    const board = await boardModel.create({
        title: boardTitle,
        description: boardDisc,
        orgId: org._id
    })
    res.status(201).json({
        message: 'board is created!',
        boardId: board._id
    })
})

app.post('/issues', authMiddleware, async (req, res) => {
    const userId = req.userId
    const title = req.body.title
    const boardId = req.body.boardId
    const status = req.body.status
    const board = await boardModel.findOne({_id: boardId})
    if (!board) {
        return res.status(404).json({ message: 'No board with this id exists in our db' })
    }
    const org = await orgModel.findOne({_id: board.orgId})
    if (!org) {
        return res.status(404).json({ message: 'Parent organization for this board not found' })
    }
    const isAdmin = org.adminId.toString() === userId
    const isMember = org.members.some(memberId => memberId.toString() === userId)
    if(!isAdmin && !isMember){
        return res.status(403).json({ message: 'You do not have access to this board' })
    }
    const issue = await issueModel.create({
        title: title,
        boardId: boardId,
        status: status || 'todo' // default to todo if not provided
    })
    res.status(201).json({
        message: 'issue_created',
        issueId: issue._id
    })
})

// get routes
app.get('/organization', authMiddleware, async (req, res) => {
    const userId = req.userId
    const orgId = req.query.orgId
    const org = await orgModel.findOne({_id: orgId})
    if(!org || org.adminId.toString() !== userId){
        return res.status(403).json({message: 'either the org does not exist or you are not the admin'})
    }
    
    res.json({
        org: org 
    })
})

app.get('/board', authMiddleware, async (req, res) => {
    const userId = req.userId
    const orgId = req.query.orgId
    const org = await orgModel.findOne({_id: orgId})
    // const isAdmin = org.adminId.toString() === userId
    const isMember = org.members.some(memberId => memberId.toString() === userId)
    if (org.adminId.toString !== userId && !isMember) {
        return res.status(403).json({ message: 'Either this org does not exist or you do not have access' })
    }
    const board = await boardModel.find({orgId: orgId})
    res.status(200).json({ 
        board 
    })
})

app.get('/issues', authMiddleware, async (req, res) => {
    const userId = req.userId
    const boardId = req.query.boardId
    const board = await boardModel.findOne({_id: boardId})
    if (!board) {
        return res.status(403).json({ message: 'No board with this id exists in our db' })
    }
    const org = await orgModel.findOne({ _id: board.orgId})
    if (!org) {
        return res.status(403).json({ message: 'Parent organization for this board not found' })
    }
    if(org.adminId.toString() !== userId && !org.members.some(m => m.toString() === userId)){
        return res.status(403).json({ message: 'You do not have access to this board' })
    }
    const issues = await issueModel.find({
        boardId: boardId
    })
    res.status(200).json({ issues, board })
})

app.get('/members', authMiddleware, async (req, res) => {
    const userId = req.userId
    const orgId = req.query.orgId
    const org = await orgModel.findOne({_id: orgId})
    if (!org || org.adminId.toString() !== userId) {  // dont forget to convert to string you cannot compare ObjectId with string man
        return res.status(411).json({ message: "Either this org does not exist or you are not an admin of this org" })
    }
    const members = await userModel.find({
        _id: {$in: org.members}
    }, '_id username')
    res.json({
        members: members
    })
})

// update routes
app.put('/issues', authMiddleware, async (req, res) => {
    const userId = req.userId
    const boardId = req.body.boardId
    const issueId = req.body.issueId
    const afterTitle = req.body.afterTitle
    const state = req.body.state

    const board = await boardModel.findOne({_id: boardId})
    if (!board) {
        return res.status(404).json({ message: "No board with this id exists in our db" })
    }
    const org = await orgModel.findOne({_id: board.orgId})
    if(!org){
        return res.status(404).json({ message: "Parent organization for this board not found" })
    }

    const isAdmin = org.adminId.toString() === userId
    const isUser = org.members.some(memberId => memberId.toString() === userId)
    if (!isAdmin && !isUser) {
        return res.status(403).json({ message: 'You do not have access to this board' })
    }

    const issue = await issueModel.findOne({
        _id: issueId,
        boardId: boardId
    })
    if (!issue) {
        return res.status(404).json({ message: 'No issue with this id exists on this board' })
    }
    if(afterTitle){
        issue.title = afterTitle
    }
    const VALID_STATES = ['todo', 'inprogress', 'done', 'archived']
    if (state) {
        if (!VALID_STATES.includes(state)) {
            return res.status(400).json({ message: 'Invalid state' })
        }
        issue.status = state
    }
    // after updating we also need to save
    await issue.save()
    res.status(200).json({
        message: "issue updated",
        issue
    })
})

// delete routes
app.delete('/members', authMiddleware, async (req, res) => {
    const userId = req.userId
    const orgId = req.body.orgId
    const memberUsername = req.body.memberUsername

    const org = await orgModel.findOne({_id: orgId})
    if (!org || org.adminId.toString() !== userId) {
        return res.status(411).json({ message: 'Either this org does not exist or you are not permitted to access it' })
    }
    const member = await userModel.findOne({username: memberUsername})
    if(!member){
        return res.status(403).json({message: 'no user with this username'})
    }
    
    org.members.pull(member._id)
    await org.save()
    res.json({ message: 'user removed from org successfully' })
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(3000, () => {
    console.log('Trello app running at http://localhost:3000')
})
