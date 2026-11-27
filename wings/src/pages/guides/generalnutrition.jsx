import Footer from "../../components/footer";
import LineDivider from "../../components/line-divider";
import Navbar from "../../components/navbar";
import "./trainingguide.css";
import { Link } from "react-router-dom";

export function GeneralNutrition() {
  return (
    <>
      <Navbar />
      <div className="guide-hero">
        <div className="guide-hero--title">general nutrition</div>
        <div className="guide-hero--blurb">
          Welcome to the general nutrition guide from WINGS. This guide will
          cover nutrition, weight, protein intake, and supplement use.
        </div>
      </div>

      <LineDivider />

      <div className="guide-container">
        <div className="guide-heading">protein</div>
        <div className="guide-text">
          Nutrition and diet is one of the core contributors to your success in
          calisthenics. The most important factor to consider is your protein
          intake. Shoot for{" "}
          <strong>0.8-1 grams of protein per lb of body weight</strong> or{" "}
          <strong>1.8-2.2 grams of protein per kg of bodyweight</strong>. This
          is a <strong>bare minimum</strong>; your body will use this protein to
          grow muscle. If you aren’t getting enough protein, and there’s a high
          chance you aren’t, you are limiting your muscle growth and strength
          potential. There are many sources of protein, including red meats,
          poultry, fish, eggs, yogurt, beans, and nuts. Animal-based protein
          from fish, meat, and poultry, eggs, and dairy, give you the most
          protein, but also include plant based protein to have a well-rounded
          diet. In general, it doesn’t matter when you eat your protein as long
          as you hit your target amount, but still try to spread out the protein
          intake throughout the day.
        </div>

        <div className="guide-heading">carbohydrates</div>
        <div className="guide-text">
          Carbohydrates are also extremely important for your training. These
          will provide you the energy you need for intense workouts. In general,
          get your carbs from <strong>complex carbohydrates</strong>, such as
          whole grains, fruits, beans, and starchy vegetables. These carbs
          contain fiber and slowly replenish your energy. On the other hand,
          avoid <strong>refined carbs</strong>, like white bread, sugary drinks,
          pasta, candy, and desserts. These foods are heavily processed, lacking
          fiber and nutrients, and cause blood sugar spikes and energy crashes.
          These types of carbs are more likely to contribute to weight gain as
          well, and in general are unhealthy.
        </div>

        <div className="guide-heading">fats</div>
        <div className="guide-text">
          Fats are the last macro that you’ll need daily. These contribute to
          overall health, hormone production, and energy. Choose{" "}
          <strong>healthy fats</strong> from sources like avocados, nuts, seeds,
          and olive oil. You probably don’t need to focus on fats, since you’ll
          get them naturally through most foods.
        </div>

        <div className="guide-heading">hydration</div>
        <div className="guide-text">
          There is one more thing you also need. <strong>Hydration!!</strong>{" "}
          Most people do not drink enough water, and this can lead to reduced
          performance and strength, and increase the risk of fatigue and injury.
          Being dehydrated may help you look shredded, but for normal training,
          it reduces performance, and negatively impacts your ability. Aim to
          drink water throughout the day and stay hydrated.
        </div>

        <div className="guide-heading">meal timing</div>
        <div className="guide-text">
          For more intermediate athletes, pre/post-workout meals may be
          beneficial for performance and muscle growth. Pre-workout meals are
          meals or snacks before your workout, and they should be eaten between{" "}
          <strong>30 minutes to an hour</strong> before your workout. The bigger
          the meal, the longer you should wait before you workout. During your
          workout, you want to be energized, meaning for a pre-workout meal,
          make sure to have carbs. The best type of carb is a{" "}
          <strong>complex carb</strong>, which will provide long lasting energy
          throughout the workout. For example, yogurt or fruit. What you don’t
          want to do is eat something super sweet and sugary, like candy or
          pastries, because this can create sugar/insulin spikes, and lead to an
          energy crash during your workout.
        </div>

        <div className="guide-text">
          Cheat meals are important too. Be completely honest with yourself. Can
          you really eat fully clean for a year straight? Probably not. Cheat
          meals don’t hurt. <strong>Once or twice a week</strong>, it’s okay to
          eat food that isn’t totally optimized for your training. Also, you
          don’t even have to go crazy on training on a strict diet. Sure, it’ll
          help with progress, but you can still make progress without going on a
          100% strict diet. Just make sure you're hitting{" "}
          <strong>high protein</strong> and depending on your weight goals, the
          right amount of calories.
        </div>

        <div className="guide-heading">supplements</div>
        <div className="guide-text">
          In terms of supplements, the most commonly used supplement will be
          protein shakes and protein powder. With such high protein goals, if
          you can’t consistently hit them, you can use protein supplements like
          these. But make sure that these protein supplements aren’t your main
          source of protein; you want to be able to meet protein requirements
          using as much <strong>whole foods</strong> as possible. Another
          supplement to consider is <strong>collagen</strong>, which is the main
          building block for your tendons and ligaments. Your connective tissue
          is extremely prone to injury, especially for calisthenics athletes,
          since they have a much slower recovery rate compared to muscle. So,
          making sure you have enough collagen can help strengthen and speed up
          connective tissue{" "}
          <Link to="/training/restandrecovery" className="guide-external-link">
            recovery
          </Link>
          .
        </div>

        <div className="guide-text">
          There’s also pre-workout, which essentially gives you an energy boost
          before your workout. It can be extremely good because the extra energy
          helps you perform better in your workouts, meaning higher intensity
          and more volume. Thus, you get more stimulus and more strength gain.
          Just know that some people can experience side effects, like jitters
          or health problems. The last main supplement to consider is{" "}
          <strong>creatine</strong>, which helps muscle store water and acts as
          a source of energy. Overall, you get a general performance boost in
          your workouts. While many of these supplements are beneficial, it’s
          important to remember that{" "}
          <strong>none of these supplements are essential</strong>, and you
          should never feel pressured to purchase any of these just to achieve
          marginally better performance.
        </div>

        <div className="guide-heading">body weight</div>
        <div className="guide-text">
          As a calisthenics athlete, you should aim to be as light as possible
          while trying to be as strong as possible. This is the recipe for
          achieving insane skills like the planche and maltese. However, you
          don’t want to be too light or too lean, because it can also have
          negative health effects and cause overall fatigue. Most pro
          calisthenics athletes are lean, shredded, but strong, since consistent
          training and continuous optimization leads these pro athletes to
          become that way. However, low body fat also reduces the rate of muscle
          growth. For calisthenics athletes, aim for around{" "}
          <strong>9%-15% body fat</strong> to optimize building muscle.
        </div>

        <div className="guide-text">
          So, what weight should we be aiming for? Use your BMI to get a general
          idea of where you are. If you’re underweight, eat in a{" "}
          <strong>calorie surplus</strong> and try to gain some muscle and
          weight. If you’re average, aim to maintain your weight, but build
          muscle and lose fat. Finally, if you’re overweight, eat in a{" "}
          <strong>calorie deficit</strong> and try to lose that fat that isn’t
          contributing to your strength. Disclaimer:{" "}
          <strong>BMI is NOT accurate</strong>. You can have a high BMI and be
          extremely muscular. BMI is used for{" "}
          <Link to="/training/beginnerguide" className="guide-external-link">
            beginners
          </Link>{" "}
          who haven’t trained at all, who are also more likely to have a high
          BMI due to fat instead of muscle.
        </div>
      </div>

      <Footer />
    </>
  );
}
