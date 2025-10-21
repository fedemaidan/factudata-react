start-dev:
	npm run dev

deployX:
	npm run build
	npm run export
	node src/tools/updateVersion.js
	firebase deploy


VERSION := $(shell date +'%Y-%m-%d-%H:%M')-$(shell git rev-parse --short HEAD)

deploy:
	NEXT_PUBLIC_APP_VERSION=$(VERSION) npm run build
	NEXT_PUBLIC_APP_VERSION=$(VERSION) npm run export
	NEXT_PUBLIC_APP_VERSION=$(VERSION) node src/tools/updateVersion.js
	firebase deploy


deploy_v2:
	npm run build
	npm run export
	dotenv -e .env.production.local -- firebase deploy --token "$FIREBASE_TOKEN"
