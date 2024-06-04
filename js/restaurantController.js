import { getCookie } from "./util.js";
import { Coordinate } from "./entities.js";

const MODEL = Symbol("RestaurantModel");
const VIEW = Symbol("RestaurantView");

const AUTH = Symbol("AUTH");
const USER = Symbol("USER");

const LOAD_RESTAURANT_OBJECTS = Symbol("Load Restaurant Objects");

class RestaurantController {
  constructor(model, view, auth) {
    this[MODEL] = model;
    this[VIEW] = view;
    this[AUTH] = auth;
    this[USER] = null;
    //Campo para mantener el contexto actual de los breadcrumbs
    this.currentContext = { type: "home", name: "Inicio", href: "#" };

    this.onLoad();
  }

  [LOAD_RESTAURANT_OBJECTS](data) {
    const categories = data.categories;
    const allergens = data.allergens;
    const dishes = data.dishes;
    const menus = data.menus;
    const restaurants = data.restaurants;

    for (const category of categories) {
      const categ = this[MODEL].createCategory(
        category.name,
        category.description
      );
      categ.url = category.url;
      this[MODEL].addCategory(categ);
    }

    for (const allergen of allergens) {
      const allerg = this[MODEL].createAllergen(
        allergen.name,
        allergen.description
      );
      this[MODEL].addAllergen(allerg);
    }

    for (const dish of dishes) {
      const newDish = this[MODEL].createDish(
        dish.name,
        dish.description,
        dish.ingredients,
        dish.image
      );
      this[MODEL].addDish(newDish);
      const allergens = dish.allergens;

      for (const allergName of allergens) {
        const allerg = this[MODEL].createAllergen(allergName);
        this[MODEL].assignAllergenToDish(newDish, allerg);
      }

      const categ = this[MODEL].createCategory(dish.category);
      this[MODEL].assignCategoryToDish(newDish, categ);
    }

    for (const menu of menus) {
      const newMenu = this[MODEL].createMenu(menu.name, menu.description);
      this[MODEL].addMenu(newMenu);
      const dishes = menu.dishes;
      for (const dishName of dishes) {
        const dish = this[MODEL].createDish(dishName);
        this[MODEL].assignDishToMenu(newMenu, dish);
      }
    }

    for (const restaurant of restaurants) {
      const locat = new Coordinate(
        restaurant.location[0],
        restaurant.location[1]
      );
      const rest = this[MODEL].createRestaurant(
        restaurant.name,
        restaurant.description,
        locat
      );
      this[MODEL].addRestaurant(rest);
    }
  }

  onLoad = () => {
    //se cogen los datos iniciales desde el json
    fetch("./data/data.json", {
      method: "get",
    })
      .then((response) => response.json())
      .then((data) => {
        //se cargan los datos aquí
        this[LOAD_RESTAURANT_OBJECTS](data);
      })
      .then(() => {
        this.onAddCategory();
        this[VIEW].showRandomProduct(this[MODEL].getterDishes());
        this.onAddAllergen();
        this.onAddMenu();
        this.onAddRestaurant();
        this[VIEW].createCloseWindow();

        if (getCookie("acceptedCookieMessage") !== "true") {
          this[VIEW].showCookiesMessage();
        }

        const userCookie = getCookie("activeUser");
        if (userCookie) {
          const user = this[AUTH].getUser(userCookie);
          if (user) {
            this[USER] = user;
            this.onOpenSession();
          }
        } else {
          this.onCloseSession();
        }

        this.onInit();

        this[VIEW].bindInit(this.handleInit);
      });
  };

  onInit = () => {
    const isLoggedIn = this[USER] !== null;
    this[VIEW].showCategories(this[MODEL].getterCategories());
    this[VIEW].bindProductsCategoryList(this.handleProductsCategoryList);
    this[VIEW].showRandomProduct(this[MODEL].getterDishes());
    this[VIEW].bindShowRandomProduct(this.handleShowProduct);
    this[VIEW].bindFavDishHandler(this.handleFavDish);
  };

  handleInit = () => {
    this.onInit();
  };

  onAddCategory = () => {
    this[VIEW].showCategoriesInMenu(this[MODEL].getterCategories());
    this[VIEW].bindProductsCategoryListInMenu(this.handleProductsCategoryList);
  };

  onAddAllergen = () => {
    this[VIEW].showAllergensInMenu(this[MODEL].getterAllergens());
    this[VIEW].bindProductsAllergenListInMenu(this.handleProductsAllergenList);
  };

  onAddMenu = () => {
    this[VIEW].showMenusInMenu(this[MODEL].getterMenus());
    this[VIEW].bindProductsMenuListInMenu(this.handleProductsMenuList);
  };

  onAddRestaurant = () => {
    this[VIEW].showRestaurantsInMenu(this[MODEL].getterRestaurants());
    this[VIEW].bindRestaurantsInMenu(this.handleRestaurant);
  };

  handleProductsCategoryList = (categoryName) => {
    try {
      const category = this[MODEL].createCategory(categoryName, "");
      const dishes = this[MODEL].getDishesInCategory(category);

      const dishesArray = [...dishes];
      this.currentContext = {
        type: "category",
        name: `Categoría: ${categoryName}`,
        href: `#category-${categoryName}`,
      };

      this[VIEW].updateBreadcrumbs(
        this.currentContext.name,
        this.currentContext.href
      );
      this[VIEW].listProducts(dishesArray, categoryName, this[USER] !== null);
      this[VIEW].bindShowProduct(this.handleShowProduct);
    } catch (error) {
      console.error("Error obteniendo platos para la categoría:", error);
      this[VIEW].listProducts([], categoryName, this[USER] !== null);
    }
  };

  handleProductsAllergenList = (allergenName) => {
    try {
      this[VIEW].updateBreadcrumbs(
        `Alérgeno: ${allergenName}`,
        `#allergen-${allergenName}`
      );
      // console.log("Seleccionando platos para el alérgeno:", allergenName);
      const allergen = this[MODEL].createAllergen(allergenName, "");

      const dishes = this[MODEL].getDishesWithAllergen(allergen);
      const dishesArray = [...dishes];

      // console.log("Platos disponibles con el alérgeno:", dishesArray);
      this[VIEW].listProducts(
        dishesArray,
        `Platos con ${allergenName}`,
        this[USER] !== null
      );
      this[VIEW].bindShowProduct(this.handleShowProduct);
    } catch (error) {
      console.error("Error obteniendo platos para el alérgeno:", error);
      this[VIEW].listProducts([], allergenName, this[USER] !== null);
    }
  };

  handleProductsMenuList = (menuName) => {
    try {
      this[VIEW].updateBreadcrumbs(`Menú: ${menuName}`, `#menu-${menuName}`);
      const menu = this[MODEL].createMenu(menuName, "");

      const dishes = this[MODEL].getDishesInMenu(menu);
      const dishesArray = [...dishes];

      this[VIEW].listProducts(
        dishesArray,
        `Menú "${menuName}"`,
        this[USER] !== null
      );
      this[VIEW].bindShowProduct(this.handleShowProduct);
    } catch (error) {
      this[VIEW].listProducts(
        [],
        `Platos del Menú ${menuName}`,
        this[USER] !== null
      );
    }
  };

  handleRestaurant = (name) => {
    this[VIEW].updateBreadcrumbs(`Restaurante: ${name}`, `#restaurant-${name}`);

    const rest = this[MODEL].createRestaurant(name, "", new Coordinate(1, 1));
    this[VIEW].showRestaurant(rest, rest.name);
  };

  handleShowProduct = (productName) => {
    try {
      const product = this[MODEL].createDish(productName, "", [], "");

      //Actualiza los breadcrumbs usando el contexto actual
      this[VIEW].updateBreadcrumbs(
        this.currentContext.name,
        this.currentContext.href
      );
      this[VIEW].updateBreadcrumbs(`Plato: ${productName}`, `#single-product`);
      this[VIEW].showProduct(product, "");
      //t6 - asociamos el evento del botón con showProductInNewWindow
      this[VIEW].bindShowProductInNewWindow(this.handleShowProductInNewWindow);
      //t6 - cerrar ventana
      this[VIEW].closeWindows();
    } catch (error) {
      this[VIEW].showProduct(null, "No existe este producto en la página.");
    }
  };

  //t6 - manejador nueva ventana
  handleShowProductInNewWindow = (productName, targetWindow) => {
    try {
      const product = this[MODEL].createDish(productName, "", [], "");
      const allergens = [...this[MODEL].getAllergensForDish(product)];
      this[VIEW].showProductInWindow(product, allergens, "", targetWindow);
    } catch (error) {
      this[VIEW].showProductInWindow(
        null,
        [],
        "No existe este producto en la página.",
        targetWindow
      );
    }
  };

  //t7

  //creacion de platos
  handleNewDishForm = () => {
    this[VIEW].showNewDishForm(
      this[MODEL].getterCategories(),
      this[MODEL].getterAllergens()
    );
    this[VIEW].bindNewDishForm(this.handleCreateDish);
  };

  handleCreateDish = (
    name,
    desc,
    ingredients,
    image,
    categoryName,
    allergens
  ) => {
    const dish = this[MODEL].createDish(name, desc, ingredients, image);
    const category = this[MODEL].createCategory(categoryName, "");

    let done;
    let error;
    try {
      this[MODEL].addDish(dish);
      this[MODEL].assignCategoryToDish(dish, category);

      for (const allergenName of allergens) {
        const allergen = this[MODEL].createAllergen(allergenName, "");
        this[MODEL].assignAllergenToDish(dish, allergen);
      }
      done = true;
    } catch (exception) {
      done = false;
      error = exception;
    }
    this[VIEW].showNewDishModal(done, dish, error);
  };

  //eliminación de platos
  handleRemoveDishForm = () => {
    this[VIEW].showRemoveDishForm(this[MODEL].getterCategories());
    this[VIEW].bindRemoveDishSelects(this.handleRemoveDishListByCategory);
  };

  handleRemoveDish = (name) => {
    let done;
    let error;
    let product;
    try {
      product = this[MODEL].createDish(name);
      this[MODEL].removeDish(product);
      done = true;
    } catch (exception) {
      done = false;
      error = exception;
    }
    this[VIEW].showRemoveDishModal(done, product, error);
    if (done) {
      this.refreshCurrentDishList();
    }
  };

  //usado para actualizar la vista correctamente en cuanto hemos eliminado ya uno o más platos.
  refreshCurrentDishList = () => {
    const currentCategory = document.querySelector("#remDishCat").value;
    const category = this[MODEL].createCategory(currentCategory);
    const dishes = this[MODEL].getDishesInCategory(category);

    const dishesArray = [...dishes];
    this[VIEW].showRemoveDishList(dishesArray);
    this[VIEW].bindRemoveDish(this.handleRemoveDish);
  };

  handleRemoveDishListByCategory = (category) => {
    const categ = this[MODEL].createCategory(category);
    this[VIEW].showRemoveDishList(this[MODEL].getDishesInCategory(categ));
    this[VIEW].bindRemoveDish(this.handleRemoveDish);
    this[VIEW].bindShowProduct(this.handleShowProduct);
  };

  //creación de categorías
  handleNewCategoryForm = () => {
    this[VIEW].showNewCategoryForm();
    this[VIEW].bindNewCategoryForm(this.handleCreateCategory);
  };

  handleCreateCategory = (name, url, desc) => {
    const cat = this[MODEL].createCategory(name, desc);
    cat.url = url;

    let done;
    let error;
    try {
      this[MODEL].addCategory(cat);
      done = true;
      this.onAddCategory();
    } catch (exception) {
      done = false;
      error = exception;
    }
    this[VIEW].showNewCategoryModal(done, cat, error);
  };

  //eliminación de categorías
  handleRemoveCategoryForm = () => {
    this[VIEW].showRemoveCategoryForm(this[MODEL].getterCategories());
    this[VIEW].bindRemoveCategoryForm(this.handleRemoveCategory);
  };

  handleRemoveCategory = (title) => {
    let done;
    let error;
    let cat;
    try {
      //siguiendo los apuntes, getCategory no funciona en mi caso
      //createCategory siempre asegura que haya una instancia válida de category
      cat = this[MODEL].createCategory(title);
      this[MODEL].removeCategory(cat);
      done = true;
      this.onAddCategory();
      this.handleRemoveCategoryForm(); //para hacer que desaparezca la categoría una vez borrada
    } catch (exception) {
      done = false;
      error = exception;
    }
    this[VIEW].showRemoveCategoryModal(done, cat, error);
  };

  //creacion de restaurantes
  handleNewRestaurantForm = () => {
    this[VIEW].showNewRestaurantForm();
    this[VIEW].bindNewRestaurantForm(this.handleCreateRestaurant);
  };

  handleCreateRestaurant = (name, desc, lat, long) => {
    const loc = new Coordinate(Number.parseInt(lat), Number.parseInt(long));
    const rest = this[MODEL].createRestaurant(name, desc, loc);

    let done;
    let error;
    try {
      this[MODEL].addRestaurant(rest);
      done = true;
      this.onAddRestaurant();
    } catch (exception) {
      console.log(exception);
      done = false;
      error = exception;
    }
    this[VIEW].showNewRestaurantModal(done, rest, error);
  };

  //modificacion de categorias
  handleModifyCategoriesForm = () => {
    this[VIEW].showModifyCategoriesForm(this[MODEL].getterDishes());
    this[VIEW].bindModifyCategories(this.handleModifyCategories);
    this[VIEW].bindModifyCategoriesForm(this.handleModificationCategories);
  };

  handleModificationCategories = (dish, assignCat, deassignCat) => {
    let done;
    let error;
    try {
      const dishObj = this[MODEL].createDish(dish);
      if (assignCat.length >= 1) {
        for (const cat of assignCat) {
          const catObj = this[MODEL].createCategory(cat);
          //test
          console.log(
            "Asignando categoría:",
            catObj.name,
            "del plato:",
            dishObj.name
          );
          this[MODEL].assignCategoryToDish(dishObj, catObj);
          //test
          console.log(
            "Categorías después de asignar:",
            this[MODEL].getCategoriesOfDish(dishObj.name)
          );
        }
      }
      if (deassignCat.length >= 1) {
        for (const cat of deassignCat) {
          const catObj = this[MODEL].createCategory(cat);
          //test
          console.log(
            "Desasignando categoría:",
            catObj.name,
            "del plato:",
            dishObj.name
          );
          this[MODEL].deassignCategoryToDish(dishObj, catObj);
          //test
          console.log(
            "Categorías después de desasignar:",
            this[MODEL].getCategoriesOfDish(dishObj.name)
          );
        }
      }
    } catch (exception) {
      done = false;
      error = exception;
    }

    done = true;

    this[VIEW].showModifyCategoriesModal(done, error);
  };

  handleModifyCategories = (dishName) => {
    const dish = this[MODEL].createMenu(dishName);
    const form = document.getElementsByName("fModCategories")[0];

    for (const input of form.querySelectorAll("div.row")) {
      input.remove();
    }
    for (const space of form.querySelectorAll("div.mb-12")) {
      space.remove();
    }
    for (const button of form.querySelectorAll("button")) {
      button.remove();
    }
    const categoriesDish = this[MODEL].getCategoriesOfDish(dish.name);

    const allCategories = [...this[MODEL].getterCategories()];

    const categoriesNotInDish = allCategories.filter((cat) => {
      return !categoriesDish.some((category) => category.name === cat.name);
    });
    this[VIEW].showModifyCategoriesSelects(categoriesDish, categoriesNotInDish);
  };

  //asignación de platos a menús (ordenación no hecha aún)
  handleAssignDishesForm = () => {
    this[VIEW].showAssignDishesForm(this[MODEL].getterMenus());
    this[VIEW].bindAssignationDishes(this.handleAssignDishes);
    this[VIEW].bindAssignationDishesForm(this.handleAssignationDishes);
  };

  handleAssignationDishes = (menu, assDishes, deasDishes) => {
    let done;
    let error;
    try {
      const menuObj = this[MODEL].createMenu(menu);
      if (assDishes.length >= 1) {
        for (const dish of assDishes) {
          const dishCreated = this[MODEL].createDish(dish);
          this[MODEL].assignDishToMenu(menuObj, dishCreated);
        }
      }
      if (deasDishes.length >= 1) {
        for (const dish of deasDishes) {
          const dishCreated = this[MODEL].createDish(dish);
          this[MODEL].deassignDishToMenu(menuObj, dishCreated);
        }
      }
    } catch (exception) {
      done = false;
      error = exception;
    }

    done = true;

    this[VIEW].showDishesAssignationModal(done, error);
  };

  handleAssignDishes = (menuName) => {
    const menu = this[MODEL].createMenu(menuName);
    const form = document.getElementsByName("fAssignDishes")[0];

    for (const input of form.querySelectorAll("div.row")) {
      input.remove();
    }
    for (const space of form.querySelectorAll("div.mb-12")) {
      space.remove();
    }
    for (const button of form.querySelectorAll("button")) {
      button.remove();
    }
    const dishesInMenu = [...this[MODEL].getDishesInMenu(menu)];

    const allDishesObj = [...this[MODEL].getterDishes()];
    const allDishes = [];
    for (const dish of allDishesObj) {
      allDishes.push(dish.dish);
    }

    const dishesNotInMenu = allDishes.filter((dish) => {
      return !dishesInMenu.some((menuDish) => menuDish.name === dish.name);
    });
    this[VIEW].showAssignDishesSelects(dishesInMenu, dishesNotInMenu);
  };

  handleLoginForm = () => {
    this[VIEW].showLogin();
    this[VIEW].bindLogin(this.handleLogin);
  };

  handleLogin = (username, password, remember) => {
    if (this[AUTH].validateUser(username, password)) {
      this[USER] = this[AUTH].getUser(username);
      this.onOpenSession();
      if (remember) {
        this[VIEW].setUserCookie(this[USER]);
      }
    } else {
      this[VIEW].showInvalidUserMessage();
    }
  };

  onOpenSession() {
    this.onInit();
    this[VIEW].initHistory();
    this[VIEW].showAuthUserProfile(this[USER]);
    this[VIEW].bindCloseSession(this.handleCloseSession);
    this[VIEW].showAdminMenu();
    this[VIEW].bindAdminMenu(
      this.handleNewDishForm,
      this.handleRemoveDishForm,
      this.handleNewCategoryForm,
      this.handleRemoveCategoryForm,
      this.handleNewRestaurantForm,
      this.handleModifyCategoriesForm,
      this.handleAssignDishesForm,
      this.handleShowFavDishes,
      this.handleCreateBackup
    );
  }

  handleCloseSession = () => {
    this.onCloseSession();
    this.onInit();
    this[VIEW].initHistory();
  };

  onCloseSession() {
    this[USER] = null;
    this[VIEW].deleteUserCookie();
    this[VIEW].showIdentificationLink();
    this[VIEW].bindIdentificationLink(this.handleLoginForm);
    this[VIEW].removeAdminMenu();
  }

  handleFavDish = (dishName) => {
    const favDishes = JSON.parse(localStorage.getItem("favDishes")) || [];
    if (!favDishes.includes(dishName)) {
      favDishes.push(dishName);
      localStorage.setItem("favDishes", JSON.stringify(favDishes));
      this[VIEW].showFavDishModal(true, dishName);
    } else {
      this[VIEW].showFavDishModal(false, dishName);
    }
  };

  handleShowFavDishes = () => {
    const favDishes = JSON.parse(localStorage.getItem("favDishes")) || [];
    const dishes = favDishes.map((dishName) =>
      this[MODEL].createDish(dishName, "", [], "")
    );
    this[VIEW].listProducts(
      dishes,
      "Platos Favoritos",
      this[USER] !== null,
      false //se oculta el botón de favoritos en cada plato del showFavDishes
    );
    this[VIEW].bindShowProduct(this.handleShowProduct);
  };

  //creacion del json backup
  handleCreateBackup = () => {
    const objects = {
      categories: [],
      dishes: [],
      allergens: [],
      menus: [],
      restaurants: [],
    };

    const categories = this[MODEL].getterCategories();
    for (const category of categories) {
      objects.categories.push({
        name: category.name,
        description: category.description,
        url: category.url || "",
      });
    }

    const dishes = this[MODEL].getterDishes();
    for (const dish of dishes) {
      const categ = dish.categories.length > 0 ? dish.categories[0].name : "";
      const dishAllerg = dish.allergens;
      const allerg = [];
      for (const dishAll of dishAllerg) {
        allerg.push(dishAll.name);
      }

      objects.dishes.push({
        name: dish.dish.name,
        description: dish.dish.description,
        ingredients: dish.dish.ingredients,
        image: dish.dish.image,
        category: categ,
        allergens: allerg,
      });
    }

    const allergens = this[MODEL].getterAllergens();
    for (const allerg of allergens) {
      objects.allergens.push({
        name: allerg.name,
        description: allerg.description,
      });
    }

    const menus = this[MODEL].getterMenus();
    for (const menu of menus) {
      const menuDishes = menu.dishes;
      const dishNames = [];
      for (const dish of menuDishes) {
        dishNames.push(dish.dish.name);
      }

      objects.menus.push({
        name: menu.menu.name,
        description: menu.menu.description,
        dishes: dishNames,
      });
    }

    const restaurants = this[MODEL].getterRestaurants();
    for (const rest of restaurants) {
      const locat = rest.location
        ? [rest.location.latitude, rest.location.longitude]
        : [];

      objects.restaurants.push({
        name: rest.name,
        description: rest.description,
        location: locat,
      });
    }

    //el nombre del fichero tendrá la fecha Y hora ()
    const fileName = `backup_${
      new Date().toISOString().split("T")[0]
    }_${new Date().toTimeString().split(" ")[0].replace(/:/g, "-")}.json`;

    const formData = new FormData();
    formData.append("fileName", fileName);
    formData.append("json", JSON.stringify(objects, null, 2)); //evitar que se muestre todo en una sola linea con el "2"

    fetch("./backup_base.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          this[VIEW].showBackupModal(true, result.valid);
        } else {
          this[VIEW].showBackupModal(false, result.error);
        }
      });
  };
}

export default RestaurantController;
