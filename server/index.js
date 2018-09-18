const { GraphQLServer } = require('graphql-yoga')
const { decodeToken, TokenVerifier } = require('jsontokens')

const authMiddleware = async (resolve, root, args, context, info) => {
  // get the JWT from Authorization header
  const rawToken = context.request.get('Authorization').replace('Bearer ', '')

  // decode the JWT to get the token header and payload
  const decodedToken = decodeToken(rawToken)

  // the public key used to secure the JWT is signalled in the Key ID header parameter
  const publicKey = decodedToken.header.kid

  // verify the JWT
  const verified = new TokenVerifier('ES256K', publicKey).verify(rawToken)

  if (!verified) {
    throw new Error('Unauthorised')
  }

  const result = await resolve(root, args, context, info)

  return result
}

const resolvers = {
  Query: {
    hello: (root, args) => {
      return {
        greeting: `Hello, ${args.input.name}`,
      }
    },
  },
}

const typeDefs = `
  input HelloInput {
    name: String!
  }

  type Hello {
    greeting: String!
  }

  type Query {
    hello(input: HelloInput!): Hello!
  }
`

const server = new GraphQLServer({
  context: req => req,
  middlewares: [authMiddleware],
  resolvers,
  typeDefs,
})

server.start(() => {
  console.log('Server up on http://localhost:4000')
})
