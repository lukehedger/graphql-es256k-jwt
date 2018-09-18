import { InMemoryCache } from 'apollo-cache-inmemory'
import { ApolloClient } from 'apollo-client'
import { ApolloLink } from 'apollo-link'
import { createHttpLink } from 'apollo-link-http'
import { ec } from 'elliptic'
import { print } from 'graphql/language/printer'
import gql from 'graphql-tag'
import { decodeToken, TokenSigner } from 'jsontokens'
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
      payload: {
        operationName: operation.operationName,
        query: print(operation.query),
        variables: operation.variables,
      },
    })

    // set token context
    operation.setContext(({}) => ({
      token: token,
    }))

    return forward(operation)
  } catch (e) {
    throw new Error(e)
  }
})

const createHttpJwtLink = opts => new ApolloLink((operation, forward) => {
  const context = operation.getContext()

  return new Observable(observer => {
    fetch(opts.uri, {
      body: JSON.stringify(decodeToken(context.token)),
      headers: Object.assign(
        {},
        {
          accept: '*/*',
          authorization: `Bearer ${context.token}`,
          'content-type': 'application/jose+json',
        },
        context.headers,
      ),
      method: 'POST',
    })
      .then(response => {
        operation.setContext({ response })

        return response
      })
      .then(response => {
        return response.text()
          .then(bodyText => {
            try {
              return JSON.parse(bodyText)
            } catch (err) {
              return Promise.reject(err)
            }
          })
      })
      .then(result => {
        observer.next(result)

        observer.complete()

        return result
      })
      .catch(err => {
        if (err.result && err.result.errors && err.result.data) {
          observer.next(err.result)
        }

        observer.error(err)
      })
  })
})

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([
    authLink,
    createHttpJwtLink({
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
