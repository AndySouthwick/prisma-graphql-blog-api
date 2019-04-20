const {prisma, Authorization} = require('./generated/prisma-client')
const {GraphQLServer} = require('graphql-yoga');
const jwt = require('jsonwebtoken')
const secret = require('./secrets')
const bcrypt = require('bcrypt');
const saltRounds = 10;
const getClaims = require("./verify")
const {rule, shield, and, or, not} = require("graphql-shield");

const resolvers = {
  Query: {
    allPosts(root, args, context) {
      return context.prisma.posts()
    },
    allUsers(root, args, context) {
      return context.prisma.user()
    },
    publishedPosts(root, args, context) {
      return context.prisma.posts({where: {published: true}})
    },
    post(root, args, context) {
      return context.prisma.post({id: args.postId})
    },
    postsByUser(root, args, context) {
      return context.prisma.user({
        id: args.userId
      }).posts()
    }
  },
  Mutation: {
    createDraft(root, args, context) {
      return context.prisma.createPost({
          title: args.title,
          author: {
            connect: {id: args.userId}
          },
          content: args.content,
          imgUrl: args.imgUrl
        },
      )
    },
    updateAPost(root, args, context){
      console.log(args)
      return context.prisma.updatePos({
          where:{id: args.postId},
          data: {
            published: args.published,
            title: args.title,
            content: args.content,
            imgUrl: args.imgUrl
          }
          },
      )
    },
    publish(root, args, context) {
      return context.prisma.updatePost(
        {
          where: {id: args.postId},
          data: {published: args.published},
        },
      )
    },
    deleteThePost(root, args, context) {
      return context.prisma.deletePost({id: args.postId})
    },
    createUser(root, args, context) {
      const hash = bcrypt.hashSync(args.hashed, saltRounds)
      return context.prisma.createUser(
        {
          email: args.email,
          hashed: hash
        }
      )
    },
    async loginUser(root, args, context) {
      console.log(args)
      const getUser = await context.prisma.user({email: args.email})
      const hashCheck = bcrypt.compareSync(args.hashed, getUser.hashed);
      if (hashCheck) {
        return {
          token: jwt.sign({
              exp: Math.floor(Date.now() / 1000) + (60 * 24),
              claims: true
            },
            secret,
            {
              algorithm: "HS256"
            })
        }

      }
    }
  },

  User: {
    posts(root, args, context) {
      return context.prisma.user({
        id: root.id
      })
    }
  },
  Post: {
    author(root, args, context) {
      return context.prisma.post({
        id: root.id
      }).author()
    }
  }
}
const isAuthenticated = rule()(async (parent, args, ctx, info) => {
  console.log(ctx.claims)
  return ctx.claims !== null
})
const permissions = shield({
  Query: {
    allPosts: isAuthenticated
  },
  Mutation: {
    createDraft: isAuthenticated,
    publish: isAuthenticated,
    deleteThePost: isAuthenticated,
    updateAPost: isAuthenticated
  }
});
const server = new GraphQLServer({
  typeDefs: './schema.graphql',
  resolvers,
  context: req => ({
    prisma,
    ...req,
    claims: getClaims(req)
  }),
  middlewares: [permissions]
})

server.start(() => console.log("Server is running on http://localhost:4000"));