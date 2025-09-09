start-dev:
	npm run dev

deploy:
	npm run build
	npm run export
	firebase deploy

deploy_v2:
	npm run build
	npm run export
	dotenv -e .env.production.local -- firebase deploy --token "$FIREBASE_TOKEN"
