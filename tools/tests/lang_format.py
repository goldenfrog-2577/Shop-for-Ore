from pathlib import Path
import unittest


class LanguageFormatTests(unittest.TestCase):
	def test_resource_pack_bytes(self):
		texts = Path(__file__).parents[2] / 'resource_packs/main-rp-shop_for_ore/texts'
		for locale in ['ru_RU', 'en_US', 'uk_UA', 'es_ES']:
			with self.subTest(locale=locale):
				data = (texts / (locale + '.lang')).read_bytes()
				self.assertEqual(data.startswith(bytes.fromhex('efbbbf')), locale in ['uk_UA', 'es_ES'])
				self.assertIn(b'\r\n', data)
				self.assertNotIn(b'\n', data.replace(b'\r\n', b''))
				self.assertNotIn(b'\r', data.replace(b'\r\n', b''))
				data.decode('utf-8-sig')


if __name__ == '__main__':
	unittest.main()
