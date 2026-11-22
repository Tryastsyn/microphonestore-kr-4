package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type Product struct {
	Name     string
	Price    int
	Discount int
	InStock  bool
}

func formatPrice(price int) string {
	return fmt.Sprintf("%d ₽", price)
}

func calculateDiscount(price, percent int) int {
	return price * percent / 100
}

func productStatus(product Product) string {
	if !product.InStock {
		return "Нет в наличии"
	}
	if product.Discount > 0 {
		return "В наличии, со скидкой"
	}
	return "В наличии"
}

func shortDescription(product Product) string {
	finalPrice := product.Price - calculateDiscount(product.Price, product.Discount)
	return fmt.Sprintf("%s — %s (%s)", product.Name, formatPrice(finalPrice), productStatus(product))
}

func main() {
	data, err := os.ReadFile("products.json")
	if err != nil {
		fmt.Println("Не удалось открыть products.json:", err)
		return
	}

	var products map[string]Product
	if err := json.Unmarshal(data, &products); err != nil {
		fmt.Println("Ошибка в products.json:", err)
		return
	}

	fmt.Print("Введите ID товара, например product-5: ")
	var id string
	if _, err := fmt.Scanln(&id); err != nil {
		fmt.Println("Введите ID товара.")
		return
	}

	product, found := products[id]
	if !found {
		fmt.Println("Товар с таким ID не найден.")
		return
	}
	if product.Price < 0 || product.Discount < 0 || product.Discount > 100 {
		fmt.Println("Проверьте цену и скидку товара в products.json.")
		return
	}

	discount := calculateDiscount(product.Price, product.Discount)
	fmt.Println("Цена:", formatPrice(product.Price))
	fmt.Println("Скидка:", formatPrice(discount))
	fmt.Println("Итог:", formatPrice(product.Price-discount))
	fmt.Println("Статус:", productStatus(product))
	fmt.Println("Описание:", shortDescription(product))
}