import { InMemoryCache } from 'apollo-cache-inmemory'
import { ApolloClient } from 'apollo-client'
import { ApolloLink } from 'apollo-link'
import { createHttpLink } from 'apollo-link-http'
import { ec } from 'elliptic'
import gql from 'graphql-tag'
import { keccak256 } from 'js-sha3'
import { TokenSigner } from 'jsontokens'
import React from 'react'
import { ApolloProvider, Query } from 'react-apollo'
import ReactDOM from 'react-dom'

const elliptic = new ec('secp256k1')

const authLink = new ApolloLink((operation, forward) => {
  try {
    // generate ECDSA keys
    const keys = elliptic.genKeyPair()
    const privateKey = keys.getPrivate('hex')
    const publicKey = keys.getPublic('hex')

    // generate JSON Web Token
    const token = new TokenSigner('ES256K', privateKey).sign({
      header: {
        alg: 'ES256K',
        kid: publicKey,
        typ: 'JWT',
      },
      payload: operation,
    })

    // set request header
    operation.setContext(({ headers }) => ({
      headers: {
        authorization: `Bearer ${token}`,
      },
    }))

    return forward(operation)
  } catch (e) {
    throw new Error(e)
  }
})

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([
    authLink,
    createHttpLink({
      uri: 'http://localhost:4000/',
    }),
  ])
})

const HelloQuery = () => (
  <Query
    query={gql`
      query HelloQuery($input: HelloInput!) {
        hello(input: $input) {
          greeting
        }
      }
    `}
    variables={{ input: { name: "Wordl" } }}>
    {({ loading, error, data }) => {
      if (loading) return <p>Loading</p>
      if (error) return <p>{error.message}</p>

      return (
        <h1>{data.hello.greeting}</h1>
      )
    }}
  </Query>
)

const App = () => {
  return (
    <ApolloProvider client={client}>
      <HelloQuery />
    </ApolloProvider>
  )
}

ReactDOM.render(<App />, document.getElementById('Root'))
