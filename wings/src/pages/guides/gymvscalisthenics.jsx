import Footer from "../../components/footer";
import LineDivider from "../../components/line-divider";
import Navbar from "../../components/navbar";
import "./trainingguide.css";

export function GymVsCalisthenics() {
  return (
    <>
      <Navbar />
      <div className="guide-hero">
        <div className="guide-hero--title">gym vs calisthenics</div>
        <div className="guide-hero--blurb">
          Welcome to the gym vs calisthenics guide from WINGS. This guide will
          cover strength training, hypertrophy training, their differences in
          results, as well as the difference between gym and calisthenics
          workouts.
        </div>
      </div>

      <LineDivider />

      <div className="guide-container">
        <div className="guide-heading">strength training</div>

        <div className="guide-text">
          Muscle strength is defined as the ability of a muscle or group of
          muscles to exert force. Calisthenics typically focuses on strength
          training because we want to produce the maximum amount of force with a
          minimal amount of bodyweight to lift. Beside just your muscle fibers,
          your nervous system is also being trained here. By using high
          intensity exercises, you are training your brain and nervous system to
          recruit more and more muscle fibers, which allows for you to have more
          strength output.
        </div>

        <div className="guide-text">
          Strength rep ranges are typically low, around 1-8 reps per set. For
          training purposes, we keep that rep range at 4-8 reps per set, in
          order to accumulate volume. In terms of rest times, strength training
          typically is more intense and requires higher rest times, around 4-8
          minutes. This long rest time is to allow the muscle and nervous system
          to recover as fully as possible between sets, so we can keep pushing
          through hard sets with high intensity.
        </div>
      </div>

      <LineDivider />

      <div className="guide-container">
        <div className="guide-heading">hypertrophy training</div>

        <div className="guide-text">
          Muscle hypertrophy is defined as an increase in muscle size, measured
          in a cross-sectional area. Hypertrophy is essentially muscle growth,
          and bodybuilders usually use this type of training to maximise muscle
          growth and size for their competitions. For calisthenics, hypertrophy
          is most useful to grow base muscle mass, and is necessary for you to
          have strength.
        </div>

        <div className="guide-text">
          Hypertrophy rep ranges are typically high, around 8-15 reps per set.
          For training, we use that rep range as beginners to build muscle
          foundation. As we get more advanced though, we typically only utilize
          hypertrophy training for volume and muscle stimulus, as it isn’t as
          beneficial as strength training. This is as simple as doing 3 sets of
          dips at the end of a push workout, or 3 sets of pullups at the end of
          a pull workout, both to failure.
        </div>
      </div>

      <LineDivider />

      <div className="guide-container">
        <div className="guide-heading">maximising training</div>

        <div className="guide-text">
          Essentially, you need both strength and hypertrophy to be successful
          in calisthenics. As a beginner, you’ll focus more on hypertrophy, as
          you start building your base muscle size. However, as you slowly
          transition to becoming a more advanced athlete, the amount of
          hypertrophy training you need slowly decreases, since you’ll have
          built the necessary amount of muscle.
        </div>

        <div className="guide-text">
          In training, this looks like starting with a strength block first,
          training high intensity with low reps. Typically, this is skill work.
          When you finish skill work and accessories, you’ll switch to the
          volume and hypertrophy phase, where you’ll try to burn out your
          muscles and trigger the growth process.
        </div>
      </div>

      <LineDivider />

      <div className="guide-container">
        <div className="guide-heading">gym vs calisthenics workouts</div>

        <div className="guide-text">
          For most people, the gym is the place to lift weight and build muscle.
          Because of this, most gym workouts are focused on hypertrophy, and
          lifting using hypertrophy rep ranges and lower intensities. This is
          different from calisthenics, where we prioritize strength and high
          intensity, and work within the strength training rep ranges, before
          then moving to hypertrophy.
        </div>

        <div className="guide-text">
          Another difference between the training styles is the element of
          skill. With workouts in the gym, it’s super easy and simple to
          progressively overload. Just add on another plate, or lock in more of
          the stack. However, with calisthenics, our progressive overload
          requires learning new movement patterns and different muscle
          activations. This makes calisthenics more complicated to progress
          through, as well as more tedious to move up in strength. On the other
          hand, this is also the same thing that makes calisthenics so rewarding
          to practice.
        </div>

        <div className="guide-text">
          As previously mentioned, progressions often require the addition of
          more muscle groups, bringing us to another difference between gym
          workouts and calisthenics workouts. Calisthenics commonly utilizes
          compound exercises, which are exercises that target many different
          muscles and joints in the body at once. Gym training also uses
          compound exercises, but often incorporates isolation exercises, which
          target one muscle group at a time. Compound exercises are good at
          improving muscle coordination and building body awareness. However,
          these exercises don’t hit all muscles equally, which can lead to
          imbalances and disproportionately weaker muscle groups. This isn’t a
          problem for holding skills, which only require that certain amount of
          strength for each muscle. But if you want your body to be as well
          rounded as possible, isolation exercises from the gym can prove to be
          extremely useful.
        </div>

        <div className="guide-text">
          This is where you can combine gym and calisthenics training for
          maximum growth in muscle and strength. Firstly, train calisthenics
          like normal, doing normal strength focused calisthenics workouts.
          Towards the end of the session, you can use machines to isolate and
          target weak muscle groups and ensure the muscle group you want to
          stimulate is stimulated.
        </div>
      </div>

      <Footer />
    </>
  );
}
