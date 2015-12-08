# Running the Server

    cd node
    npm install
    npm run start
    curl http://localhost:8080/ledis -X POST -H 'Content-Type: application/json' -d '{"command": "HELP"}'
