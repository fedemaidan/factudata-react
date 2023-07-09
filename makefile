start-dev:
	npm run dev

deploy:
	npm run build
	npm run export
	firebase deploy