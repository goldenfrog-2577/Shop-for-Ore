import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('shop_lang', Path(__file__).parents[1] / 'lang.py')
lang = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lang)


class PlaceholderTests(unittest.TestCase):
	def test_indexed_reordering(self):
		self.assertEqual(lang.parameters('%1$s: %2$d'), lang.parameters('%2$d: %1$s'))

	def test_types_and_duplicates(self):
		self.assertNotEqual(lang.parameters('%1$s'), lang.parameters('%1$d'))
		self.assertNotEqual(lang.parameters('%1$s'), lang.parameters('%1$s %1$s'))

	def test_positional_order(self):
		self.assertNotEqual(lang.parameters('%s %d'), lang.parameters('%d %s'))
		self.assertEqual(lang.parameters('%s %d %f %i'), lang.parameters('%s / %d / %f / %i'))


if __name__ == '__main__':
	unittest.main()
