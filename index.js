// Building a basic CRUD application (Create, Read, Update, Delete).
// Trello-like app: organizations → boards → issues (cards with states as columns).

const express = require('express')
const path = require('path')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const createAuthMiddleware = require('./middlewares')

const app = express()
const SECRET_KEY = 'secrethai'
const authMiddleware = createAuthMiddleware(SECRET_KEY)

app.use(express.json())
app.use(cors())
app.use(express.static(__dirname))

// database - just arrays lol
let USERId = 2
let ORGId = 1
let BOARDId = 1
let ISSUEId = 2

const users = [{
    userId: 1,
    username: "admin",
    password: "123123"
}, {
    userId: 2,
    username: "test1",
    password: "123123"
}]

const organizations = [{
    orgId: 1,
    title: 'gods_org',
    description: 'this is the organization of gods',
    adminId: 1,
    members: [2]
}]

const boards = [{
    boardId: 1,
    title: 'gods_board',
    description: 'this is the board of gods',
    orgId: 1,
}]

const issues = [{
    issueId: 1,
    title: 'gods_issue',
    boardId: 1,
    state: "in_progress"
}, {
    issueId: 2,
    title: 'gods_issue_2',
    boardId: 1,
    state: "to_do"
}]

const VALID_STATES = ["to_do", "in_progress", "done", "archived"]

function findOrg(orgId) {
    return organizations.find(o => o.orgId === orgId)
}

function findBoard(boardId) {
    return boards.find(b => b.boardId === boardId)
}

function orgForBoard(boardId) {
    const board = findBoard(boardId)
    if (!board) return null
    return findOrg(board.orgId)
}

function userCanAccessOrg(org, userId) {
    if (!org) return false
    return org.adminId === userId || org.members.includes(userId)
}

function userIsOrgAdmin(org, userId) {
    return org && org.adminId === userId
}

function userCanAccessBoard(boardId, userId) {
    const org = orgForBoard(boardId)
    return userCanAccessOrg(org, userId)
}

// post routes
app.post('/signup', (req, res) => {
    const username = req.body.username
    const password = req.body.password
    const userExists = users.find(u => u.username === username)
    if (userExists) {
        return res.status(403).json({ message: 'User already exists' })
    }
    USERId++
    users.push({ userId: USERId, username, password })
    res.json({ message: 'you have signed up successfully', userId: USERId })
})

app.post('/signin', (req, res) => {
    const username = req.body.username
    const password = req.body.password
    const userExists = users.find(u => u.username === username && u.password === password)
    if (!userExists) {
        return res.status(403).json({ message: 'Please signup first' })
    }
    const token = jwt.sign({ userId: userExists.userId }, SECRET_KEY)
    res.json({
        message: 'you have signed in successfully',
        token,
        userId: userExists.userId
    })
})

app.post('/organization', authMiddleware, (req, res) => {
    ORGId++
    organizations.push({
        orgId: ORGId,
        title: req.body.title,
        description: req.body.description,
        adminId: req.userId,
        members: []
    })
    res.status(201).json({
        message: "New Org Created",
        orgId: ORGId
    })
})

app.post('/add-member-to-org', authMiddleware, (req, res) => {
    const orgId = parseInt(req.body.orgId)
    const memberUsername = req.body.memberUsername
    const org = findOrg(orgId)
    if (!org || !userIsOrgAdmin(org, req.userId)) {
        return res.status(411).json({ message: 'Either this org does not exist or you are not permitted to access it' })
    }
    const member = users.find(u => u.username === memberUsername)
    if (!member) {
        return res.status(411).json({ message: 'No user with this username exists' })
    }
    if (member.userId === org.adminId) {
        return res.status(411).json({ message: 'Admin is already part of this organization' })
    }
    if (org.members.includes(member.userId)) {
        return res.status(411).json({ message: 'User is already a member of this organization' })
    }
    org.members.push(member.userId)
    res.json({ message: 'user added to org successfully' })
})

app.post('/board', authMiddleware, (req, res) => {
    const orgId = parseInt(req.body.orgId)
    const boardTitle = req.body.boardTitle
    const boardDisc = req.body.boardDisc
    const org = findOrg(orgId)
    if (!org || !userIsOrgAdmin(org, req.userId)) {
        return res.status(404).json({ message: "either the org does not exist or you are not the admin of the org" })
    }
    BOARDId++
    boards.push({
        boardId: BOARDId,
        title: boardTitle,
        description: boardDisc,
        orgId: orgId
    })
    res.status(201).json({
        message: 'board is created!',
        boardId: BOARDId
    })
})

app.post('/issues', authMiddleware, (req, res) => {
    const boardId = parseInt(req.body.boardId)
    const title = req.body.title
    const board = findBoard(boardId)
    if (!board) {
        return res.status(404).json({ message: 'No board with this id exists in our db' })
    }
    if (!userCanAccessBoard(boardId, req.userId)) {
        return res.status(403).json({ message: 'You do not have access to this board' })
    }
    ISSUEId++
    issues.push({
        issueId: ISSUEId,
        title: title,
        boardId: board.boardId,
        state: "to_do"
    })
    res.status(201).json({
        message: 'issue_created',
        issueId: ISSUEId
    })
})

// get routes
app.get('/organizations', authMiddleware, (req, res) => {
    const userId = req.userId
    const orgs = organizations
        .filter(o => userCanAccessOrg(o, userId))
        .map(o => ({
            orgId: o.orgId,
            title: o.title,
            description: o.description,
            isAdmin: o.adminId === userId
        }))
    res.json({ organizations: orgs })
})

app.get('/organization', authMiddleware, (req, res) => {
    const orgId = parseInt(req.query.orgId)
    const org = findOrg(orgId)
    if (!org || !userCanAccessOrg(org, req.userId)) {
        return res.status(411).json({ message: 'Either this org does not exist or you are not permitted to access it' })
    }
    res.json({
        org: {
            orgId: org.orgId,
            title: org.title,
            description: org.description,
            adminId: org.adminId,
            isAdmin: org.adminId === req.userId,
            members: org.members.map(memberId => {
                const member = users.find(u => u.userId === memberId)
                return {
                    id: member.userId,
                    username: member.username
                }
            })
        }
    })
})

app.get('/board', authMiddleware, (req, res) => {
    const orgId = parseInt(req.query.orgId)
    const organization = findOrg(orgId)
    if (!organization || !userCanAccessOrg(organization, req.userId)) {
        return res.status(403).json({ message: 'Either this org does not exist or you do not have access' })
    }
    const board = boards.filter(b => b.orgId === organization.orgId)
    res.status(200).json({ board })
})

app.get('/issues', authMiddleware, (req, res) => {
    const boardId = parseInt(req.query.boardId)
    const board = findBoard(boardId)
    if (!board) {
        return res.status(403).json({ message: 'No board with this id exists in our db' })
    }
    if (!userCanAccessBoard(boardId, req.userId)) {
        return res.status(403).json({ message: 'You do not have access to this board' })
    }
    const issue = issues.filter(i => i.boardId === board.boardId)
    res.status(200).json({ issue, board })
})

app.get('/members', authMiddleware, (req, res) => {
    const orgId = parseInt(req.query.orgId)
    const organization = findOrg(orgId)
    if (!organization || !userIsOrgAdmin(organization, req.userId)) {
        return res.status(411).json({ message: "Either this org does not exist or you are not an admin of this org" })
    }
    res.json({
        members: organization.members.map(memberId => {
            const userObj = users.find(u => u.userId === memberId)
            return {
                id: userObj.userId,
                username: userObj.username
            }
        })
    })
})

// update routes
app.put('/issues', authMiddleware, (req, res) => {
    const boardId = parseInt(req.body.boardId)
    const issueId = parseInt(req.body.issueId)
    const afterTitle = req.body.afterTitle
    const state = req.body.state

    const board = findBoard(boardId)
    if (!board) {
        return res.status(404).json({ message: "No board with this id exists in our db" })
    }
    if (!userCanAccessBoard(boardId, req.userId)) {
        return res.status(403).json({ message: 'You do not have access to this board' })
    }

    const issue = issues.find(i => i.issueId === issueId && i.boardId === boardId)
    if (!issue) {
        return res.status(404).json({ message: 'No issue with this id exists on this board' })
    }
    if (afterTitle) {
        issue.title = afterTitle
    }
    if (state) {
        if (!VALID_STATES.includes(state)) {
            return res.status(400).json({ message: 'Invalid state' })
        }
        issue.state = state
    }
    res.status(200).json({
        message: "issue updated",
        issue
    })
})

// delete routes
app.delete('/issues', authMiddleware, (req, res) => {
    const boardId = parseInt(req.body.boardId)
    const issueId = parseInt(req.body.issueId)
    const board = findBoard(boardId)
    if (!board) {
        return res.status(404).json({ message: 'No board with this id exists in our db' })
    }
    if (!userCanAccessBoard(boardId, req.userId)) {
        return res.status(403).json({ message: 'You do not have access to this board' })
    }
    const index = issues.findIndex(i => i.issueId === issueId && i.boardId === boardId)
    if (index === -1) {
        return res.status(404).json({ message: 'No issue with this id exists on this board' })
    }
    issues.splice(index, 1)
    res.json({ message: 'issue deleted' })
})

app.delete('/board', authMiddleware, (req, res) => {
    const boardId = parseInt(req.body.boardId)
    const board = findBoard(boardId)
    if (!board) {
        return res.status(404).json({ message: 'No board with this id exists in our db' })
    }
    const org = findOrg(board.orgId)
    if (!org || !userIsOrgAdmin(org, req.userId)) {
        return res.status(403).json({ message: 'Only the org admin can delete boards' })
    }
    const boardIndex = boards.findIndex(b => b.boardId === boardId)
    boards.splice(boardIndex, 1)
    for (let i = issues.length - 1; i >= 0; i--) {
        if (issues[i].boardId === boardId) {
            issues.splice(i, 1)
        }
    }
    res.json({ message: 'board deleted' })
})

app.delete('/members', authMiddleware, (req, res) => {
    const orgId = parseInt(req.body.orgId)
    const memberUsername = req.body.memberUsername
    const org = findOrg(orgId)
    if (!org || !userIsOrgAdmin(org, req.userId)) {
        return res.status(411).json({ message: 'Either this org does not exist or you are not permitted to access it' })
    }
    const member = users.find(u => u.username === memberUsername)
    if (!member) {
        return res.status(411).json({ message: 'No user with this username exists' })
    }
    org.members = org.members.filter(id => id !== member.userId)
    res.json({ message: 'user removed from org successfully' })
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(3000, () => {
    console.log('Trello app running at http://localhost:3000')
})
