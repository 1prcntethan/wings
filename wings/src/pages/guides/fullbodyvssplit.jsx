import Footer from "../../components/footer";
import LineDivider from "../../components/line-divider";
import Navbar from "../../components/navbar";
import "./trainingguide.css";

export function FullBodyVsSplit() {
  return (
    <>
      <Navbar />
      <div className="guide-hero">
        <div className="guide-hero--title">full-body vs split training</div>
        <div className="guide-hero--blurb">
          Welcome to the full-body vs split routine guide from WINGS. This guide
          will cover full-body workouts, split workouts, and which one is better
          for you.
        </div>
      </div>

      <LineDivider />

      <div className="guide-container">
        <div className="guide-heading">full body workouts</div>

        <div className="guide-text">
          The optimal full body workout involves targeting all the major muscle
          groups in the body, usually working them out 3x a week. One advantage
          to the full body workout is convenience. You can finish a full body
          workout within around 90 minutes, and you only have to do this 3x a
          week. Compared to split training, you commit time to a workout way
          less frequently. Also, it's easier to stick to a routine, since you’re
          working out less.
        </div>

        <div className="guide-text">
          Another reason the full body routine is well suited for beginners is
          the frequency that it allows you to hit muscle groups. By training a
          full body routine, you can hit all the main muscles in your body and
          exploit the fact that your body doesn’t need as much stimulus to build
          muscle. With the low recovery time and minimal stimulus for gains, you
          can get away with working out all the muscle groups in the body at
          once. This is why, for complete beginners, the full body workout is
          the most recommended.
        </div>
      </div>

      <LineDivider />

      <div className="guide-container">
        <div className="guide-heading">split workouts</div>

        <div className="guide-text">
          As beginners workout more and more, their newbie gains eventually give
          out and it starts to require more and more stimulus to build muscle.
          Additionally, this increase in necessary stimulus leads to longer
          muscle recovery times. This is where split workouts shine. Split
          workouts involve splitting workouts into separate similar muscle
          groups. You workout one group on one day and the next day another
          group, letting the previous one rest and continuing this pattern. The
          most common split in calisthenics is the PPL split, which stands for
          Push-Pull-Legs. An example routine may look like this: D1 Push, D2
          Pull, D3 Legs, D4 Push, D5 Pull, D6 Legs, D7 Rest.
        </div>

        <div className="guide-text">
          These split workouts aim to workout each muscle group 2x a week. This
          is, in fact, a lower frequency than the full body workout, but it’s
          necessary if you want to be able to focus on specific muscle groups
          and weaknesses. Overall, this split is much more effective for
          athletes past the newbie gains and who are fully committed to the
          journey, which on this site is around the High Beginner/Low
          Intermediate stage.
        </div>
      </div>

      <Footer />
    </>
  );
}
