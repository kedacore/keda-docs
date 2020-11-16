# Contributing to KEDA

Thanks for helping make KEDA better 😍.

There are many areas we can use contributions - documenting scalers, adding FAQ, troubleshooting, samples, and more.

Our documentation is versioned so it's important to make the changes for the correct KEDA version. If you need to introduce a new version, we recommend reading our documentation about it [here](https://github.com/kedacore/keda-docs#working-with-documentation-versions).

## Getting Help

If you have a question about KEDA or how best to contribute, the [#KEDA](https://kubernetes.slack.com/archives/CKZJ36A5D) channel on the Kubernetes slack channel ([get an invite if you don't have one already](https://slack.k8s.io/)) is a good place to start.  We also have regular [community stand-ups](https://github.com/kedacore/keda#community) to track ongoing work and discuss areas of contribution.  For any issues with the product you can [create an issue](https://github.com/kedacore/keda/issues/new) in this repo.

## Contributing New Documentation

We provide easy ways to introduce new content:

- [Adding new blog post](https://github.com/kedacore/keda-docs#adding-scaler-documentation)
- [Adding new scaler documentation](https://github.com/kedacore/keda-docs#adding-scaler-documentation)
- [Add new Frequently Asked Question (FAQ)](https://github.com/kedacore/keda-docs#add-new-frequently-asked-question-faq)
- [Add new troubleshooting guidance](https://github.com/kedacore/keda-docs#add-new-troubleshooting-guidance)

## Creating and building a local environment

[Details on setup of a development environment are found on the README](https://github.com/kedacore/keda-docs#running-the-site-locally)

## Developer Certificate of Origin: Signing your work

### Every commit needs to be signed

The Developer Certificate of Origin (DCO) is a lightweight way for contributors to certify that they wrote or otherwise have the right to submit the code they are contributing to the project. Here is the full text of the DCO, reformatted for readability:
```
By making a contribution to this project, I certify that:

    (a) The contribution was created in whole or in part by me and I have the right to submit it under the open source license indicated in the file; or

    (b) The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate open source license and I have the right under that license to submit that work with modifications, whether created in whole or in part by me, under the same open source license (unless I am permitted to submit under a different license), as indicated in the file; or

    (c) The contribution was provided directly to me by some other person who certified (a), (b) or (c) and I have not modified it.

    (d) I understand and agree that this project and the contribution are public and that a record of the contribution (including all personal information I submit with it, including my sign-off) is maintained indefinitely and may be redistributed consistent with this project or the open source license(s) involved.
```

Contributors sign-off that they adhere to these requirements by adding a `Signed-off-by` line to commit messages.

```
This is my commit message

Signed-off-by: Random J Developer <random@developer.example.org>
```
Git even has a `-s` command line option to append this automatically to your commit message:
```
$ git commit -s -m 'This is my commit message'
```

Each Pull Request is checked  whether or not commits in a Pull Request do contain a valid Signed-off-by line.

### I didn't sign my commit, now what?!

No worries - You can easily replay your changes, sign them and force push them!

```
git checkout <branch-name>
git reset $(git merge-base master <branch-name>)
git add -A
git commit -sm "one commit on <branch-name>"
git push --force
```