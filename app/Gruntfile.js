module.exports = (grunt) => {
    require('load-grunt-tasks')(grunt);
    var convert = require('xml-js');
    const pathPackageJSON = 'package.json';
    const pathConfigXML = 'config.xml';

    grunt.initConfig({
        pkg: grunt.file.readJSON(pathPackageJSON),
        jsonlint: {
            all: {
                src: [ pathPackageJSON ],
                options: {
                    format: true,
                    indent: 2,
                    sortKeys: false
                }
            }
        },
        prompt: {
            bump: {
              options: {
                questions: [
                  {
                    config:  'increment',
                    type:    'list',
                    message: 'Bump version from ' + '<%= pkg.version %>' + ' to:',
                    choices: [
                      {
                        value: 'patch',
                        name:  'Patch:  (Backwards-compatible bug fixes.)'
                      },
                      {
                        value: 'minor',
                        name:  'Minor:  (Add functionality in a backwards-compatible manner.)'
                      },
                      {
                        value: 'major',
                        name:  'Major: '  + ' (Incompatible API changes.)' // + '<%= pkg.version %>' 
                      }
                    ]
                  }
                ],
                then: (results) => {                
                    grunt.config.set('bump.increment', [results.increment]);                      
                }
              }
            }
        },
        gitadd: {
            task: {
              options: {
                force: true
              },
              files: {
                src: [pathPackageJSON]
              }
            }
        },
        gitcommit: {
            task: {
                options: {
                    message: '<%= cnf.commitMessage %>',
                    noVerify: true,
                    noStatus: false
                },
                files: {
                    src: [pathPackageJSON, pathConfigXML]
                }
            }
        },
        gittag: {
            addtag: {
                options: {
                    tag: '<%= cnf.newVersion %>',
                    message: 'Release tag <%= cnf.newVersion %>'
                }
            },
        },
        gitpush: {
            task: {
                options: {
                    remote: '<%= cnf.remote %>',
                    branch: '<%= cnf.branchName %>',
                    upstream: '<%= cnf.upstream %>'
                }
            }
        },
        gitmerge: {
            task: {
                options: {
                    branch: '<%= cnf.branchNameToMerge %>',
                    noff: '<%= cnf.noff %>'
                }
            }
        },
        gitcheckout: {
            task: {
                options: {
                    branch: '<%= cnf.branchName %>',
                    create: '<%= cnf.createBranch %>'
                }
            }
        },
        shell: {  
            /* command: [
                'npm install bower', 
                'bower install angular'
            ].join('&&'),*/
            gitgraph: { command: 'git log --all --decorate --oneline --graph' },
            ionicBuildAndroid: { command: 'ionic cordova build android --prod'  },
            ionicBuildIOS: { command: 'ionic cordova build ios --prod'  },
            angularBuild: { command: 'ng build --prod'  }
        },
        cnf: {
            noff: true,
            remote: 'origin',
            branchNameToMerge: null,
            createBranch: false,
            newVersion: null
        }
    });
    
    grunt.registerTask('new-release', [
        'prompt:bump',
        'incress-version-number',
        'new-release-branch', 
        'write-package',
        'jsonlint',
        'update-config-xml',
        'push-bumped-version',
        'build'
    ]);

    grunt.registerTask('finish-release', [
        'set-new-version-number',
        'merge-release-master',
        'gittag',
        'merge-release-develop'
    ]);

    grunt.registerTask('git-graph', ['shell:gitgraph']);

    grunt.registerTask('set-new-version-number', () => {
        const newVersion = grunt.config('pkg.version');
        grunt.config.set('cnf.newVersion', newVersion);
        grunt.config.set('cnf.branchNameToMerge', `release/${newVersion}`);
    });

    grunt.registerTask('merge-release-master', () => {
        // git checkout master
        grunt.config.set('cnf.branchName', `master`);
        grunt.config.set('cnf.createBranch', false);
        grunt.task.run('gitcheckout');
        // git merge --no-ff release/1.2.0   
        grunt.task.run('gitmerge');
        grunt.task.run('gitpush');
    });

    grunt.registerTask('merge-release-develop', () => {
        // git checkout develop
        grunt.config.set('cnf.branchName', `develop`);
        grunt.config.set('cnf.createBranch', false);
        grunt.task.run('gitcheckout');
        // git merge --no-ff release/1.2.0
        grunt.task.run('gitmerge');
        grunt.task.run('gitpush');
    });

    grunt.registerTask('build', () => {
        if(grunt.file.isFile('ionic.config.json')){
            grunt.task.run(['shell:ionicBuildAndroid', 'shell:ionicBuildIOS']);
        } else {
            grunt.task.run('shell:angularBuild');
        }
    });   

    grunt.registerTask('new-release-branch', () => {
        grunt.config.set('cnf.branchName', `release/${grunt.config('pkg.version')}`);
        grunt.config.set('cnf.createBranch', true);
        grunt.task.run('gitcheckout');
    });

    grunt.registerTask('push-bumped-version', () => {
        grunt.config.set('cnf.commitMessage', `Bumped version to: release/${grunt.config('pkg.version')}`);
        grunt.config.set('cnf.upstream', true);
        grunt.task.run('gitadd');
        grunt.task.run('gitcommit');
        grunt.task.run('gitpush');
    });

    grunt.registerTask('write-package', () => {
        let packageJSON = grunt.config('pkg');
        grunt.file.write(pathPackageJSON, JSON.stringify(packageJSON));
    });

    grunt.registerTask('incress-version-number', () => {
        if(grunt.file.isFile(pathPackageJSON)){
            let packageJSON = grunt.config('pkg');
            handleVersionBump(grunt, packageJSON);
            grunt.config.set('pkg.version', packageJSON.version);
        }
    });

    grunt.registerTask('update-config-xml', () => {
        if(grunt.file.isFile(pathConfigXML)){
            const configXML = grunt.file.read(pathConfigXML);
            let configJSON = JSON.parse(convert.xml2json(configXML, {compact: true, spaces: 4}));
            configJSON.widget._attributes.version = grunt.config('pkg.version');
            const result = convert.json2xml(configJSON, {compact: true, ignoreComment: true, spaces: 4});
            grunt.file.write(pathConfigXML, result);
        }
    });
}

function incressMajor(semanticVersion){
    let newVersion = incressVersion(semanticVersion, 0);
    newVersion = setVersionValue(newVersion, 1, 0);
    return setVersionValue(newVersion, 2, 0);
}

function incressMinor(semanticVersion){
    let newVersion = incressVersion(semanticVersion, 1);
    return setVersionValue(newVersion, 2, 0);
}

function incressPatch(semanticVersion){
    return incressVersion(semanticVersion, 2);
}

function incressVersion(semanticVersion, level) {
    let arrVersion = semanticVersion.split('.');
    arrVersion[level] = parseInt(arrVersion[level])+1;
    return arrVersion.join('.');
}

function setVersionValue(semanticVersion, level, value) {
    let arrVersion = semanticVersion.split('.');
    arrVersion[level] = value;
    return arrVersion.join('.');
}

function handleVersionBump(grunt, packageJSON){
    switch(grunt.config('increment')){
        case 'major':
            packageJSON.version = incressMajor(packageJSON.version);
        break;
        case 'minor':
            packageJSON.version = incressMinor(packageJSON.version);
        break;
        case 'patch':
            packageJSON.version = incressPatch(packageJSON.version);
        break;
    }            
    grunt.log.writeln(packageJSON.version);
}
