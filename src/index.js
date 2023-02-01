// @ts-nocheck
addEventListener('fetch', (event) => {
	// If this request is coming from image resizing worker,
	// avoid causing an infinite loop by resizing it again:

	if (/image-resizing/.test(event.request.headers.get('via'))) {
		return fetch(event.request)
	}

	event.respondWith(handleRequest(event.request))
})

/**
 * Fetch and log a request
 * @param {Request} request
 */
async function handleRequest(request) {
	// Parse request URL to get access to query string
	const requestUrl = new URL(request.url)

	// Get URL of the original (full size) image to resize.
	// You could adjust the URL here, e.g., prefix it with a fixed address of your server,
	// so that user-visible URLs are shorter and cleaner.
	const image = requestUrl.searchParams.get('image')

	// Your Worker is responsible for automatic format negotiation. Check the Accept header.
	const accept = request.headers.get('Accept')

	if (/image\/avif/.test(accept)) {
		image.format = 'avif'
	} else if (/image\/webp/.test(accept)) {
		image.format = 'webp'
	}

	if (!image) return new Response('Missing "image" value', { status: 400 })

	try {
		// TODO: Customize validation logic
		const { hostname, pathname } = new URL(image)

		// Optionally, only allow URLs with JPEG, PNG, GIF, or WebP file extensions
		// @see https://developers.cloudflare.com/images/url-format#supported-formats-and-limitations
		if (!/\.(jpe?g|png|gif|webp)$/i.test(pathname)) {
			return new Response('Disallowed file extension', { status: 400 })
		}


		// Demo: Only accept "helplisted.com" images
		if (hostname !== 'helplisted.com') {
			return new Response('Must use "helplisted.com" source images', { status: 403 })
		}

	} catch (err) {
		return new Response('Invalid "image" value', { status: 400 })
	}

	// Build a request that passes through request headers
	const imageRequest = new Request(image, {
		headers: request.headers,
	})

	// Returning fetch() with resizing options will pass through response with the resized image.

	return fetch(imageRequest, {
		cf: {
			image: {
				draw: [
					{ url: 'https://helplisted.com/watermark.png', repeat: true, opacity: 0.2 },
				],
			},
		},
	})
}
