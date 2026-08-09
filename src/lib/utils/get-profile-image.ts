export function getProfileImage(image: string) {
	return image
		? image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/')
			? image
			: `/uploads/profiles/${image}`
		: '';
}
